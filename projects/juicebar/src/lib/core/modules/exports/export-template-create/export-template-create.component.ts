import {Component, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ExportTemplateEditorComponent} from '../export-template-editor/export-template-editor.component';
import {ExportsService} from '../exports.service';
import {ExportsTranslationPipe} from '../i18n/exports.translation';
import {ExportTemplateFormValue} from '../types/ExportTemplate';

/** Creates an export template and goes back to the templates */
@Component({
    selector: 'app-export-template-create',
    templateUrl: './export-template-create.component.html',
    imports: [ExportTemplateEditorComponent, ExportsTranslationPipe],
})
export class ExportTemplateCreateComponent {
    private readonly juicebox = inject(JuiceboxService);
    private readonly exports = inject(ExportsService);
    private readonly router = inject(Router);
    private readonly i18n = inject(ExportsTranslationPipe);

    protected readonly canCreate = !!this.juicebox.hasPermission('data-export:role#create');
    protected readonly createPromise = signal<Promise<void> | null>(null);

    constructor() {
        this.juicebox.navigationEvent({
            location: this.i18n.transform('exports'),
            subject: this.i18n.transform('create_export_template'),
            link: '/main/exports',
        });
    }

    protected create(template: ExportTemplateFormValue): void {
        this.createPromise.set(this.store(template));
    }

    private async store(template: ExportTemplateFormValue): Promise<void> {
        const result = await this.exports.createExportTemplate(template);
        if (!result) return;
        if (!result.success) {
            this.juicebox.showToast('error', this.i18n.transform(result.error));
            return;
        }
        this.juicebox.showToast('success', this.i18n.transform('export_template_created'));
        if (template.data_source_key === 'sap-data:strategy') {
            this.juicebox.showToast('warning', this.i18n.transform('sap_export_create_admin'));
        }
        await this.router.navigateByUrl('/main/exports');
    }
}
