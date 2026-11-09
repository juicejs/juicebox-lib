import {Component, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ExportTemplateEditorComponent} from '../export-template-editor/export-template-editor.component';
import {ExportsService} from '../exports.service';
import {ExportsTranslationPipe} from '../i18n/exports.translation';
import {ExportTemplate, ExportTemplateFormValue} from '../types/ExportTemplate';

/** Edits the export template of the route; another template opens in a new editor */
@Component({
    selector: 'app-export-template-edit',
    templateUrl: './export-template-edit.component.html',
    imports: [ExportTemplateEditorComponent, ExportsTranslationPipe],
})
export class ExportTemplateEditComponent {
    private readonly juicebox = inject(JuiceboxService);
    private readonly exports = inject(ExportsService);
    private readonly i18n = inject(ExportsTranslationPipe);

    protected readonly canUpdate = !!this.juicebox.hasPermission('data-export:role#update');
    protected readonly template = signal<ExportTemplate | null>(null);
    protected readonly savePromise = signal<Promise<void> | null>(null);
    private templateId: string | null = null;

    constructor() {
        inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
            this.templateId = params.get('id');
            void this.load();
        });
    }

    protected save(template: ExportTemplateFormValue): void {
        this.savePromise.set(this.store(template));
    }

    private async load(): Promise<void> {
        const id = this.templateId;
        this.template.set(null);
        if (!id) return;
        const result = await this.exports.getExportTemplate(id);
        if (!result || id !== this.templateId) return;
        if (!result.success) {
            this.juicebox.showToast('error', result.error ?? '');
            return;
        }
        this.template.set({...result.payload, _id: result.payload._id ?? id});
        this.juicebox.navigationEvent({
            location: this.i18n.transform('exports'),
            subject: result.payload.name,
            link: '/main/exports',
        });
    }

    private async store(template: ExportTemplateFormValue): Promise<void> {
        const id = this.templateId;
        if (!id) return;
        const result = await this.exports.editExportTemplate(id, template);
        if (!result) return;
        if (result.success) {
            this.juicebox.showToast('success', this.i18n.transform('template_saved'));
        } else {
            this.juicebox.showToast('error', this.i18n.transform(result.error));
        }
    }
}
