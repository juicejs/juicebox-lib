import {Component, OnInit} from '@angular/core';
import {ExportsTranslationPipe} from "../i18n/exports.translation";
import {Router} from "@angular/router";
import {ExportsService} from '../exports.service';
import {MatDialog} from "@angular/material/dialog";
import {ConfirmationDialogComponent} from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {HelperService, TableFilter, TableSort} from '../../../shared/services/helper.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ExcelExportConfirmComponent} from '../export-confirm/excel-confirm/excel-export-confirm.component';
import {PdfExportConfirmComponent} from '../export-confirm/pdf-confirm/pdf-export-confirm.component';
import {MatTableDataSource} from '@angular/material/table';
import {PageEvent} from '@angular/material/paginator';

@Component({
    selector: 'app-export-template-listing',
    templateUrl: './export-template-listing.component.html',
    styleUrls: ['./export-template-listing.component.scss']
})
export class ExportTemplateListingComponent implements OnInit {

    page = 1;
    pageSize = 10;
    rows: Array<any> = [];
    count: number = 0;
    filter: TableFilter[] = [];
    sort: TableSort = {dir: 'desc', prop: 'updated'};

    dataSources: Array<{key: string, name: string}> = []
    exportStrategies: Array<{key: string, name: string}> = []

    customName: string;

    displayedColumns: string[] = ['name', 'dataSource', 'columns', 'filters', 'actions'];
    dataSource = new MatTableDataSource<any>([]);

    i18n: ExportsTranslationPipe;
    autoLanguage: AutoLanguagePipe;
    promiseBtn;

    constructor(public juicebox: JuiceboxService,
                public helper: HelperService,
                private exports: ExportsService,
                private dialog: MatDialog,
                private router: Router) {
        this.i18n = new ExportsTranslationPipe(this.juicebox);
        this.autoLanguage = new AutoLanguagePipe(this.juicebox);

        this.juicebox.navigationEvent({
            location: this.i18n.transform('exports'),
            subject: this.i18n.transform('export_templates'),
            link: '/main/exports'
        });
    }

    ngOnInit() {
        this.getOnloadData();
    }

    getOnloadData() {
        this.fetchExportTemplates();
        this.fetchDataSourceStrategies();
        this.fetchExportStrategies();
    }

    fetchExportTemplates() {
        this.exports.getExportTemplates(this.page -1, this.pageSize, {
            sort: this.sort,
            populateColumns: true,
            populateFilters: true,
            populateDataSource: true,
            populateAvailableExportStrategies: true
        }).then((result): any => {
            if (!result) return;
            if (!result.success) return this.juicebox.showToast("error", result.error);
            this.rows = result.payload.items;
            this.count = result.payload.count;
            this.dataSource.data = this.rows;
        })
    }

    fetchDataSourceStrategies() {
        this.exports.getDataSourceStrategies().then((result): any => {
            if (!result) return;
            if (!result.success) return this.juicebox.showToast("error", result.error);
            this.dataSources = result.payload;
        })
    }


    fetchExportStrategies() {
        this.exports.getDataExportStrategies().then((result): any => {
            if (!result) return;
            if (!result.success) return this.juicebox.showToast("error", result.error);
            this.exportStrategies = result.payload;
        })
    }

    toWizard() {
        this.router.navigateByUrl('main/exports/create');
    }

    onSelect(id: string) {
        this.router.navigateByUrl('main/exports/edit/' + id);
    }

    changePage(event: number) {
        this.page = event;
        this.fetchExportTemplates();
    }

    onPageChange(event: PageEvent) {
        this.page = event.pageIndex + 1;
        this.pageSize = event.pageSize;
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
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                const deleteResult = await this.exports.deleteExportTemplate(template._id);
                if (deleteResult.success) {
                    this.juicebox.showToast("success", this.i18n.transform('template_deleted'))
                } else {
                    this.juicebox.showToast("error", this.i18n.transform(deleteResult.error))
                }
                this.fetchExportTemplates();
            }
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
            dialogRef.afterClosed().subscribe((result) => {
                if (result) {
                    this.juicebox.showToast("success", this.i18n.transform('file_exported'))
                }
                this.getOnloadData();
            });
        }
        else if (exportStrategyKey === 'excel:export:strategy') {
            const dialogRef = this.dialog.open(ExcelExportConfirmComponent, {
                disableClose: true,
                width: '800px',
                data: {
                    exportTemplate: exportTemplate,
                    exportStrategyKey: exportStrategyKey
                }
            });
            dialogRef.afterClosed().subscribe((result) => {
                if (result) {
                    this.juicebox.showToast("success", this.i18n.transform('file_exported'))
                }
                this.getOnloadData();
            });
        }
        else {
            return false;
        }
    }

    getLabels(columns: any[], newLineSeparator?: boolean) {
        return columns.map(column => this.autoLanguage.transform(column.label)).join(newLineSeparator ? ' \n' : ', ');
    }
}
