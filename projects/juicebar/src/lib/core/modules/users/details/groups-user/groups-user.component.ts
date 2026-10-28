import { ListingComponent } from '../../../../shared/components/listing/listing.component';
import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { UsersService } from '../../users.service';
import { ActivatedRoute } from '@angular/router';
import { UserTranslationPipe } from '../../i18n/user.translation';
import { GroupsModalComponent } from '../../listing/groups-modal/groups-modal.component';
import { DialogService } from '../../../../../ui-components';
import { JuiceboxService } from '../../../../shared/services/Juicebox.service';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../../shared/shared.module';
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { Result } from '../../../../shared/types/Result';
import { firstValueFrom } from 'rxjs';

interface OrgNode {
    _id: string;
    name: string;
    parent_id?: string;
    ancestors?: string[];
    children: OrgNode[];
}

interface VisibleRow {
    node: OrgNode;
    level: number;
    hasChildren: boolean;
}

@Component({
    selector: 'app-groups-user',
    styleUrls: ['./groups-user.component.scss'],
    templateUrl: './groups-user.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, SharedModule, UserTranslationPipe]
})
export class GroupsUserComponent extends ListingComponent {

    user: any = { groups: [] };

    loading = signal<boolean>(false);
    cascadeToChildren = signal<boolean>(false);

    searchTerm = signal<string>('');

    organisations = signal<any[]>([]);
    organisationTree = signal<OrgNode[]>([]);
    allGroups = signal<any[]>([]);

    expandedOrgs = signal<Set<string>>(new Set());
    selectedGroupKeys = signal<string[]>([]);

    userGroupMatrix = signal<{ [orgId: string]: { [groupKey: string]: boolean } }>({});
    originalMatrix = signal<{ [orgId: string]: { [groupKey: string]: boolean } }>({});

    promiseBtn: any;

    /** Groups currently displayed as columns. */
    protected readonly filteredGroups = computed(() => {
        const selected = this.selectedGroupKeys();
        return this.allGroups().filter(g => selected.includes(g.key));
    });

    protected readonly isSearching = computed(() => this.searchTerm().trim().length > 0);

    /** Flat list of orgs matching the org search. */
    protected readonly searchResults = computed(() => {
        const term = this.searchTerm().toLowerCase().trim();
        if (!term) return [];
        return this.organisations().filter(o => o.name.toLowerCase().includes(term));
    });

    /** Flat ordered list of org rows respecting expand/collapse state. */
    protected readonly visibleRows = computed<VisibleRow[]>(() => {
        const expanded = this.expandedOrgs();
        const rows: VisibleRow[] = [];
        const walk = (nodes: OrgNode[], level: number) => {
            for (const n of nodes) {
                const hasChildren = !!n.children && n.children.length > 0;
                rows.push({ node: n, level, hasChildren });
                if (hasChildren && expanded.has(n._id)) {
                    walk(n.children, level + 1);
                }
            }
        };
        walk(this.organisationTree(), 0);
        return rows;
    });

    protected readonly hasChanges = computed(() => {
        const current = this.userGroupMatrix();
        const original = this.originalMatrix();
        for (const orgId of Object.keys(current)) {
            const a = current[orgId] || {};
            const b = original[orgId] || {};
            for (const key of Object.keys(a)) {
                if (!!a[key] !== !!b[key]) return true;
            }
        }
        return false;
    });

    constructor(
        protected override juicebox: JuiceboxService,
        private userService: UsersService,
        public route: ActivatedRoute,
        public dialog: DialogService,
        private pipe: UserTranslationPipe,
    ) {
        super();
    }

    override async ngOnInit() {
        this.route.parent.params.subscribe(async (params): Promise<any> => {
            const result = await this.userService.getUser(params['id']);
            if (!result.success) return false;

            this.user = result.payload;
            if (!this.user.groups) this.user.groups = [];

            await this.initializeMatrix(params['id']);
        });
    }

    private async getGroups() {
        const result = await this.userService.getAllGroups();
        if (!result.success) return [];
        return result.payload || [];
    }

    async initializeMatrix(user_id: string): Promise<any> {
        this.loading.set(true);

        const [groups, orgsResult, userGroupsResult] = await Promise.all([
            this.getGroups(),
            this.juicebox.getOrganisations(user_id),
            this.userService.getUserGroups(user_id)
        ]);

        if (!orgsResult.payload || !orgsResult.payload.length) {
            this.loading.set(false);
            return false;
        }

        this.organisations.set(orgsResult.payload);
        const tree = this.buildTreeStructure(orgsResult.payload);
        this.organisationTree.set(tree);

        // Expand roots by default.
        const expanded = new Set<string>();
        tree.forEach(r => expanded.add(r._id));
        this.expandedOrgs.set(expanded);

        const sortedGroups = [...groups].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        this.allGroups.set(sortedGroups);
        this.selectedGroupKeys.set(sortedGroups.map(g => g.key));

        const matrix: { [orgId: string]: { [key: string]: boolean } } = {};
        const flat = this.flattenTree(tree);
        const userGroups = userGroupsResult?.payload?.groups || {};

        for (const org of flat) {
            matrix[org._id] = {};
            for (const g of sortedGroups) {
                matrix[org._id][g.key] = !!(userGroups[org._id] && userGroups[org._id].some((x: any) => x.key === g.key));
            }
        }

        this.userGroupMatrix.set(matrix);
        this.originalMatrix.set(this.deepCloneMatrix(matrix));
        this.loading.set(false);
    }

    toggleGroupAssignment(orgId: string, groupKey: string, isChecked: boolean) {
        const next = this.deepCloneMatrix(this.userGroupMatrix());
        if (!next[orgId]) next[orgId] = {};
        next[orgId][groupKey] = isChecked;

        if (this.cascadeToChildren()) {
            const org = this.findOrgInTree(this.organisationTree(), orgId);
            if (org && org.children) {
                this.applyCascadeToChildren(next, org.children, groupKey, isChecked);
            }
        }

        this.userGroupMatrix.set(next);
    }

    private applyCascadeToChildren(
        matrix: { [orgId: string]: { [key: string]: boolean } },
        children: OrgNode[],
        groupKey: string,
        isChecked: boolean
    ) {
        for (const child of children) {
            if (!matrix[child._id]) matrix[child._id] = {};
            matrix[child._id][groupKey] = isChecked;
            if (child.children?.length) {
                this.applyCascadeToChildren(matrix, child.children, groupKey, isChecked);
            }
        }
    }

    /** Used by UnsavedChangesGuard: grid edits are only stored on Save. */
    hasUnsavedChanges(): boolean {
        return this.hasChanges();
    }

    async saveChanges() {
        this.promiseBtn = (async () => {
            try {
                const current = this.userGroupMatrix();
                const original = this.originalMatrix();

                const additions: { orgId: string; groupKey: string }[] = [];
                const removals: { orgId: string; groupKey: string }[] = [];

                for (const orgId of Object.keys(current)) {
                    for (const groupKey of Object.keys(current[orgId])) {
                        const now = !!current[orgId][groupKey];
                        const before = !!(original[orgId] && original[orgId][groupKey]);
                        if (now === before) continue;
                        if (now) additions.push({ orgId, groupKey });
                        else removals.push({ orgId, groupKey });
                    }
                }

                if (!additions.length && !removals.length) {
                    this.juicebox.showToast('info', this.pipe.transform('no_changes_to_save'));
                    return;
                }

                if (removals.length && !(await this.confirmRemovals(removals))) return;
                this.loading.set(true);

                let failed: Result<unknown> | null = null;
                try {
                    for (const { orgId, groupKey } of additions) {
                        const result = await this.userService.addGroupToUser(groupKey, this.user._id, orgId);
                        if (!result?.success) failed ??= result ?? { success: false };
                    }
                    for (const { orgId, groupKey } of removals) {
                        const result = await this.userService.deleteGroupFromUser(groupKey, this.user._id, orgId);
                        if (!result?.success) failed ??= result ?? { success: false };
                    }
                } catch {
                    failed ??= { success: false };
                }

                if (failed) {
                    const translated = failed.error ? this.pipe.transform(failed.error) : '';
                    const message = translated && !translated.startsWith('@')
                        ? translated
                        : failed.error || this.pipe.transform('error_adding_group_to_user');
                    this.juicebox.showToast('error', this.pipe.transform('error'), message);
                } else {
                    this.juicebox.showToast('success', this.pipe.transform('success'), this.pipe.transform('successfully_updated'), { timeOut: 1000 });
                }

                // Reload so the grid shows what was actually saved, also after a partial failure
                await this.initializeMatrix(this.user._id);
            } finally {
                this.loading.set(false);
            }
        })();
    }

    private async confirmRemovals(removals: { orgId: string; groupKey: string }[]): Promise<boolean> {
        const names = [...new Set(removals.map(({ groupKey }) =>
            this.allGroups().find(group => group.key === groupKey)?.name ?? groupKey))];
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                subject: `${this.pipe.transform('groups')}: ${names.join(', ')}`,
                action: this.pipe.transform('remove'),
                destructive: true
            }
        });
        return !!(await firstValueFrom(dialogRef.closed));
    }

    toggleNode(orgId: string) {
        const next = new Set(this.expandedOrgs());
        if (next.has(orgId)) next.delete(orgId);
        else next.add(orgId);
        this.expandedOrgs.set(next);
    }

    clearSearch() {
        this.searchTerm.set('');
    }

    async openGroupEditor() {
        const dialogRef = this.dialog.open(GroupsModalComponent, {
            width: '1200px',
            maxWidth: '90vw',
            disableClose: true
        });
        dialogRef.closed.subscribe(async () => {
            if (this.user?._id) {
                await this.initializeMatrix(this.user._id);
            }
        });
    }

    private buildTreeStructure(flatOrganisations: any[]): OrgNode[] {
        const map = new Map<string, OrgNode>();
        const roots: OrgNode[] = [];

        flatOrganisations.forEach(org => {
            map.set(String(org._id), {
                _id: org._id,
                name: org.name,
                parent_id: org.parent_id,
                ancestors: org.ancestors || [],
                children: []
            });
        });

        flatOrganisations.forEach(org => {
            const node = map.get(String(org._id));
            if (!node) return;
            const parentId = org.parent_id ? String(org.parent_id) : null;

            if (parentId && map.has(parentId)) {
                map.get(parentId)!.children.push(node);
            } else if (parentId && org.ancestors?.length) {
                const closest = org.ancestors.find((id: string) => map.has(String(id)));
                if (closest) map.get(String(closest))!.children.push(node);
                else roots.push(node);
            } else {
                roots.push(node);
            }
        });

        const sortChildren = (nodes: OrgNode[]) => {
            nodes.forEach(n => {
                if (n.children.length) {
                    n.children.sort((a, b) => a.name.localeCompare(b.name));
                    sortChildren(n.children);
                }
            });
        };
        roots.sort((a, b) => a.name.localeCompare(b.name));
        sortChildren(roots);
        return roots;
    }

    private flattenTree(nodes: OrgNode[]): OrgNode[] {
        const out: OrgNode[] = [];
        const walk = (list: OrgNode[]) => {
            for (const n of list) {
                out.push(n);
                if (n.children?.length) walk(n.children);
            }
        };
        walk(nodes);
        return out;
    }

    private findOrgInTree(nodes: OrgNode[], orgId: string): OrgNode | null {
        for (const n of nodes) {
            if (n._id === orgId) return n;
            if (n.children?.length) {
                const found = this.findOrgInTree(n.children, orgId);
                if (found) return found;
            }
        }
        return null;
    }

    private deepCloneMatrix(
        m: { [orgId: string]: { [key: string]: boolean } }
    ): { [orgId: string]: { [key: string]: boolean } } {
        const out: { [orgId: string]: { [key: string]: boolean } } = {};
        for (const k of Object.keys(m)) out[k] = { ...m[k] };
        return out;
    }
}
