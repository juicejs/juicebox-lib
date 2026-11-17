import {DatePipe} from '@angular/common';
import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ButtonComponent, DialogService, IconComponent, TooltipDirective} from '../../../../../ui-components';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {EntitiesService} from '../../entities.service';
import {ApiKey} from '../../entities.types';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';
import {KeyCreationDialogComponent} from './key-creation-dialog.component';
import {KeyPreviewDialogComponent} from './key-preview-dialog.component';

/**
 * The API Access tab of an organisation: its API keys with who made them and when. A new key's token is shown once,
 * right after it was generated. As in the old tab a key is deleted without a question.
 */
@Component({
  selector: 'app-api-access',
  templateUrl: './api-access.component.html',
  styleUrl: './api-access.component.scss',
  imports: [DatePipe, ButtonComponent, IconComponent, TooltipDirective, EntitiesTranslationPipe],
  providers: [EntitiesTranslationPipe],
})
export class ApiAccessComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly organisationId: string = inject(ActivatedRoute).snapshot.parent?.params['id'];

  protected readonly keys = signal<ApiKey[]>([]);
  protected readonly generating = signal(false);
  protected readonly deleting = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  protected generateKey(): void {
    this.generating.set(true);
    this.dialog
      .open<KeyCreationDialogComponent, undefined, string | null>(KeyCreationDialogComponent)
      .closed.subscribe(async name => {
        if (name) await this.generate(name);
        this.generating.set(false);
      });
  }

  protected async deleteKey(key: ApiKey): Promise<void> {
    if (this.deleting()) return;
    this.deleting.set(true);
    await this.entities.deleteApiKey(key._id, this.organisationId).catch(() => null);
    await this.load();
    this.deleting.set(false);
  }

  private async generate(name: string): Promise<void> {
    const result = await this.entities.generateApiKey(name, this.organisationId).catch(() => null);
    void this.load();
    if (!result?.success || !result.payload?.token) {
      this.juicebox.showToast('error', this.i18n.transform('operation_failed'));
      return;
    }
    this.dialog.open<KeyPreviewDialogComponent, string>(KeyPreviewDialogComponent, {data: result.payload.token});
  }

  private async load(): Promise<void> {
    const result = await this.entities.getApiKeys(this.organisationId).catch(() => null);
    if (result?.success) this.keys.set(result.payload ?? []);
  }
}
