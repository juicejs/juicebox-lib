import {Component, inject, ChangeDetectionStrategy, signal} from '@angular/core';
import {ExportsTranslationPipe} from "../i18n/exports.translation";
import {Router, RouterLink} from "@angular/router";
import {ExportsService} from '../exports.service';
import {DialogService, DataTableComponent, CellDefDirective, SelectionDetailDefDirective, ColumnConfig, SortState} from '../../../../ui-components';
import {ConfirmationDialogComponent} from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {TableFilter, TableSort} from '../../../shared/services/helper.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ExcelExportConfirmComponent} from '../export-confirm/excel-confirm/excel-export-confirm.component';
import {PdfExportConfirmComponent} from '../export-confirm/pdf-confirm/pdf-export-confirm.component';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../../shared/shared.module';
import {ColumnLabelsPipe} from '../pipes/column-labels.pipe';

export interface PageEvent {
    pageIndex: number;
    pageSize: number;
    length: number;
}

@Component({
    selector: 'app-export-template-listing',
    templateUrl: './export-template-listing.component.html',
    styleUrls: ['./export-template-listing.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        SharedModule,
        ExportsTranslationPipe,
        DataTableComponent,
        CellDefDirective,
        SelectionDetailDefDirective,
        ColumnLabelsPipe,
    ]
})
export class ExportTemplateListingComponent {

    readonly page = signal(1);
    readonly pageSize = signal(10);
    readonly rows = signal<Array<any>>([]);
    readonly count = signal(0);
    readonly filter = signal<TableFilter[]>([]);
    readonly sort = signal<TableSort>({dir: 'desc', prop: 'updated'});
    readonly dataSources = signal<Array<{key: string, name: string}>>([]);
    readonly exportStrategies = signal<Array<{key: string, name: string}>>([]);
    readonly columns = signal<ColumnConfig[]>([]);

    public juicebox = inject(JuiceboxService);
    private exports = inject(ExportsService);
    private dialog = inject(DialogService);
    private router = inject(Router);
    private i18n = inject(ExportsTranslationPipe);
    private autoLanguage = new AutoLanguagePipe(inject(JuiceboxService));

    constructor() {
        this.juicebox.navigationEvent({
            location: this.i18n.transform('exports'),
            subject: this.i18n.transform('export_templates'),
            link: '/main/exports'
        });

        this.columns.set([
            { key: 'name', label: this.i18n.transform('name'), width: '200px', sortable: true },
            { key: '_data_source.name', label: this.i18n.transform('datasource'), width: '200px', sortable: true },
            { key: 'columns', label: this.i18n.transform('columns') },
            { key: 'filters', label: this.i18n.transform('filters') }
        ]);

        this.getOnloadData();
    }

    getOnloadData() {
        this.fetchExportTemplates();
        this.fetchDataSourceStrategies();
        this.fetchExportStrategies();
    }

    fetchExportTemplates() {
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

    fetchDataSourceStrategies() {
        this.exports.getDataSourceStrategies().then((result): any => {
            if (!result) return;
            if (!result.success) return this.juicebox.showToast("error", result.error);
            this.dataSources.set(result.payload);
        });
    }

    fetchExportStrategies() {
        this.exports.getDataExportStrategies().then((result): any => {
            if (!result) return;
            if (!result.success) return this.juicebox.showToast("error", result.error);
            this.exportStrategies.set(result.payload);
        });
    }

    toWizard() {
        this.router.navigateByUrl('main/exports/create');
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

    delete(template: any) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                action: 'delete',
                subject: this.autoLanguage.transform(template.name)
            }
        });
        dialogRef.closed.subscribe(async (result) => {
            if (!result) return;
            const deleteResult = await this.exports.deleteExportTemplate(template._id);
            if (deleteResult.success) {
                this.juicebox.showToast("success", this.i18n.transform('template_deleted'));
            } else {
                this.juicebox.showToast("error", this.i18n.transform(deleteResult.error));
            }
            this.fetchExportTemplates();
        });
    }

    openExportConfirmationModal(exportTemplate: any, exportStrategyKey: string): any {
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
        } else {
            return false;
        }
    }
}
