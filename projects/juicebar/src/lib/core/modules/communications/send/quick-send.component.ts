import {Component, inject, OnInit, signal} from '@angular/core';
import {SegmentedComponent, SegmentedOption} from '../../../../ui-components';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {CommunicationsService} from '../communications.service';
import {CHANNEL_ADAPTERS} from '../communications.types';
import {CommunicationsTranslationPipe} from '../i18n/communications.translation';
import {RecipientDirectoryService} from '../recipients/recipient-directory.service';
import {QuickSendKind, QuickSendPanelComponent} from './quick-send-panel/quick-send-panel.component';

/**
 * The Send tab (QuickSend): the tabs Email and Push (SENDTABS), Email first and open. Email shows unless the
 * `communications:tabs` configuration lists its tabs without `email`; Push only where a push channel exists and that
 * configuration is absent or lists `push`. Each tab is made anew when it opens. They are a segmented control, so they
 * don't look like the module's own tabs above them.
 */
@Component({
  selector: 'app-quick-send',
  templateUrl: './quick-send.component.html',
  styleUrl: './quick-send.component.scss',
  imports: [SegmentedComponent, QuickSendPanelComponent],
  providers: [CommunicationsTranslationPipe],
})
export class QuickSendComponent implements OnInit {
  private readonly communications = inject(CommunicationsService);
  private readonly directory = inject(RecipientDirectoryService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  protected readonly tabs = signal<SegmentedOption<QuickSendKind>[]>([]);
  protected readonly openKind = signal<QuickSendKind | null>(null);

  async ngOnInit(): Promise<void> {
    this.juicebox.navigationEvent({
      location: this.i18n.transform('communications'),
      subject: this.i18n.transform('quick_send_tool'),
      link: '/main/communications/send',
    });
    const [configuration, pushChannels] = await Promise.all([
      this.directory.getConfiguration<{options?: {tabs?: unknown}}>('communications:tabs'),
      this.communications.searchChannel('', CHANNEL_ADAPTERS.push),
    ]);
    const settings = configuration?.success ? configuration.payload : null;
    const listed = settings?.options?.tabs;
    const lists = (tab: QuickSendKind) => Array.isArray(listed) && listed.includes(tab);

    const tabs: SegmentedOption<QuickSendKind>[] = [];
    if (!Array.isArray(listed) || lists('email')) tabs.push({value: 'email', label: this.i18n.transform('email')});
    if (pushChannels?.length && (!settings || lists('push'))) tabs.push({value: 'push', label: this.i18n.transform('push')});
    this.tabs.set(tabs);
    this.openKind.set(tabs[0]?.value ?? null);
  }
}
