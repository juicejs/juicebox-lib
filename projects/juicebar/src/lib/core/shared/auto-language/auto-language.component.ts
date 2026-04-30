import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { JuiceboxService } from '../services/Juicebox.service';

@Component({
    selector: 'auto-language',
    templateUrl: './auto-language.component.html',
    styleUrls: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoLanguageComponent {
    private juicebox = inject(JuiceboxService);

    readonly value = input<unknown>();
    readonly language = input<string | undefined>();
    readonly strikethrough = input<boolean>(true);

    private resolved = computed<{ fallback: string | null; clearText: string }>(() => {
        const value = this.value();
        if (!value) return { fallback: null, clearText: '' };

        const lang = this.language() ?? this.juicebox.getLanguage();

        if (typeof value === 'object' && value !== null && (value as Record<string, unknown>)[lang]) {
            return {
                fallback: lang.split('_')[0].toUpperCase(),
                clearText: String((value as Record<string, unknown>)[lang]),
            };
        }
        if (typeof value === 'string') return { fallback: null, clearText: value };
        if (typeof value === 'number') return { fallback: null, clearText: value.toString() };

        const obj = value as Record<string, unknown>;
        const key = Object.keys(obj)[0];
        if (!key) return { fallback: null, clearText: 'Missing name translation' };
        return { fallback: key.split('_')[0].toUpperCase(), clearText: String(obj[key]) };
    });

    readonly fallback = computed(() => this.resolved().fallback);
    readonly clearText = computed(() => this.resolved().clearText);
}
