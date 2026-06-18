import { inject, provideEnvironmentInitializer, makeEnvironmentProviders } from '@angular/core';
import { ExportsTranslationPipe } from './i18n/exports.translation';
import { ModuleCustomization, EXPORTS_CUSTOMIZATION, JuicebarFeature } from '../../../config/base-app.config';
import { ExportsRoute } from './exports.route';
import { JuiceboxService } from '../../shared/services/Juicebox.service';
import { ExportsService } from './exports.service';
import { AutoLanguagePipe } from '../../shared/pipes/auto-language.pipe';

export function provideExports(customization?: ModuleCustomization): JuicebarFeature {
  return {
    routes: ExportsRoute,
    providers: makeEnvironmentProviders([
      ExportsTranslationPipe,
      {
        provide: EXPORTS_CUSTOMIZATION,
        useValue: customization ?? {},
      },
      provideEnvironmentInitializer(() => {
        const juicebox = inject(JuiceboxService);
        const exportsService = inject(ExportsService);
        const autoLanguage = new AutoLanguagePipe(juicebox);

        juicebox.registerSearchProvider(
          {
            search: async (token: string) => {
              const results = await exportsService.getExportTemplates(0, 10, {
                populateDataSource: true,
                filter: [{ property: 'name', fullText: true, language: false, term: token }],
              });
              if (!results?.success) return [];
              return results.payload.items.map(template => ({
                title: autoLanguage.transform(template.name),
                details: template._data_source?.name ?? '',
                link: 'main/exports/edit/' + (template as any)._id,
              }));
            },
          },
          'Exports',
          'fa-file-export',
          'data-export:role',
        );
      }),
    ]),
  };
}
