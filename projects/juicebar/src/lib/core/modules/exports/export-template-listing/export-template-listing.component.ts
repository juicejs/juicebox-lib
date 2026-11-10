import {Component, inject, signal} from '@angular/core';
import {ExportsTranslationPipe} from '../i18n/exports.translation';
import {Router, RouterLink} from '@angular/router';
import {ExportsService} from '../exports.service';
import {DialogService, DataTableComponent, CellDefDirective, CompactRowDefDirective, ColumnConfig, PageEvent, SortState} from '../../../../ui-components';
import {injectListingPane, ListingStateService} from '../../../shared/components/listing-pane/listing-pane';
import {ConfirmationDialogComponent} from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {TableFilter, TableSort} from '../../../shared/services/helper.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ExcelExportConfirmComponent} from '../export-confirm/excel-confirm/excel-export-confirm.component';
import {PdfExportConfirmComponent} from '../export-confirm/pdf-confirm/pdf-export-confirm.component';
import {SHARED_IMPORTS} from '../../../shared/shared-imports';
import {ColumnLabelsPipe} from '../pipes/column-labels.pipe';
import {ExportTemplate} from '../types/ExportTemplate';

/** What the listing shows, kept for the compact list next to an open template */
interface ExportsListingState {
    page: number;
    pageSize: number;
    sort: TableSort;
}

@Component({
    selector: 'app-export-template-listing',
    templateUrl: './export-template-listing.component.html',
    imports: [
        SHARED_IMPORTS,
        ExportsTranslationPipe,
        DataTableComponent,
        CellDefDirective,
        CompactRowDefDirective,
        ColumnLabelsPipe,
        RouterLink
    ]
})
export class ExportTemplateListingComponent {

    /** Set when this is the compact list next to an open template (the split view), not the page itself */
    protected readonly pane = injectListingPane();
    private readonly listingState = inject(ListingStateService);

    readonly page = signal(1);
    readonly pageSize = signal(10);
    readonly rows = signal<ExportTemplate[]>([]);
    readonly count = signal(0);
    readonly filter = signal<TableFilter[]>([]);
    readonly sort = signal<TableSort>({dir: 'desc', prop: 'updated'});
    readonly columns = signal<ColumnConfig[]>([]);

    private readonly juicebox = inject(JuiceboxService);
    private readonly exports = inject(ExportsService);
    private readonly dialog = inject(DialogService);
    private readonly router = inject(Router);
    private readonly i18n = inject(ExportsTranslationPipe);
    private readonly autoLanguage = new AutoLanguagePipe(this.juicebox);

    constructor() {
        if (this.pane) {
            const state = this.listingState.restore<ExportsListingState>('exports');
            if (state) {
                this.page.set(state.page);
                this.pageSize.set(state.pageSize);
                this.sort.set(state.sort);
            }
        } else {
            this.juicebox.navigationEvent({
                location: this.i18n.transform('exports'),
                subject: this.i18n.transform('export_templates'),
                link: '/main/exports'
            });
            this.juicebox.setActionButtons([{
                title: this.i18n.transform('create'),
                type: 'btn-primary',
                icon: 'add',
                permissions: 'data-export:role#create',
                callback: () => this.router.navigateByUrl('/main/exports/create'),
            }]);
        }

        this.columns.set([
            { key: 'name', label: this.i18n.transform('name'), width: '200px', sortable: true },
            { key: '_data_source.name', label: this.i18n.transform('datasource'), width: '200px', sortable: true },
            { key: 'columns', label: this.i18n.transform('columns') },
            { key: 'filters', label: this.i18n.transform('filters') },
            { key: 'actions', label: this.i18n.transform('actions'), width: '96px', align: 'right', ellipsis: false }
        ]);

        this.getOnloadData();
    }

    getOnloadData() {
        this.fetchExportTemplates();
    }

    fetchExportTemplates() {
        this.listingState.save('exports', {
            page: this.page(),
            pageSize: this.pageSize(),
            sort: this.sort(),
        } satisfies ExportsListingState);
        this.exports.getExportTemplates(this.page() - 1, this.pageSize(), {
            sort: this.sort(),
            populateColumns: true,
            populateFilters: true,
            populateDataSource: true,
            populateAvailableExportStrategies: true
        }).then((result): any => {
            if (!result) return;
            if (!result.success) return this.juicebox.showToast("error", result.error);
            this.rows.set(result.payload.items);
            this.count.set(result.payload.count);
        });
    }

    onSelect(id: string) {
        this.router.navigateByUrl('main/exports/edit/' + id);
    }

    onPageChange(event: PageEvent) {
        this.page.set(event.pageIndex + 1);
        this.pageSize.set(event.pageSize);
        this.fetchExportTemplates();
    }

    onSort(event: SortState) {
        this.sort.set({ prop: event.prop, dir: event.dir });
        this.page.set(1);
        this.fetchExportTemplates();
    }

    delete(template: ExportTemplate) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                // Translated, as QC has it
                action: this.i18n.transform('delete'),
                destructive: true,
                subject: this.autoLanguage.transform(template.name)
            }
        });
        dialogRef.closed.subscribe(async (result) => {
            if (!result) return;
            const deleteResult = await this.exports.deleteExportTemplate(template._id);
            if (deleteResult?.success) {
                this.juicebox.showToast("success", this.i18n.transform('template_deleted'));
            } else if (deleteResult) {
                this.juicebox.showToast("error", this.i18n.transform(deleteResult.error));
            }
            this.fetchExportTemplates();
        });
    }

    openExportConfirmationModal(exportTemplate: ExportTemplate, exportStrategyKey: string): void {
        if (exportStrategyKey.startsWith('pdf')) {
            const dialogRef = this.dialog.open(PdfExportConfirmComponent, {
                disableClose: true,
                width: '800px',
                data: {
                    exportTemplate: exportTemplate,
                    exportStrategyKey: exportStrategyKey,
                    dataSourceKey: exportTemplate.data_source_key
                }
            });
            dialogRef.closed.subscribe((result) => {
                if (result) this.juicebox.showToast("success", this.i18n.transform('file_exported'));
                this.getOnloadData();
            });
        } else if (exportStrategyKey === 'excel:export:strategy') {
            const dialogRef = this.dialog.open(ExcelExportConfirmComponent, {
                disableClose: true,
                width: '800px',
                data: {
                    exportTemplate: exportTemplate,
                    exportStrategyKey: exportStrategyKey
                }
            });
            dialogRef.closed.subscribe((result) => {
                if (result) this.juicebox.showToast("success", this.i18n.transform('file_exported'));
                this.getOnloadData();
            });
        }
    }
}
