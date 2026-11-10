import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {of} from 'rxjs';
import {CATEGORIES_CUSTOMIZATION, CategoriesCustomization} from '../../../../../config/base-app.config';
import {provideJuicebarTesting, signInTestUser} from '../../../../../../testing/juicebar-testing';
import {DialogService} from '../../../../../ui-components';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {Juice} from '../../../../shared/services/juice.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {CategoriesService} from '../../categories.service';
import {Category} from '../../categories.types';
import {CategoriesTranslationPipe} from '../../i18n/categories.translation';
import {DetailsCategoryComponent} from './details-category.component';

const stored: Category = {
  _id: 'food', name: {en_GB: 'Food', de_DE: 'Essen'}, description: {de_DE: 'Lecker'}, order: 0, active: true,
  organisation_id: 'org-2',
};

interface Setup {
  config?: Record<string, unknown>;
  customization?: CategoriesCustomization;
  permissions?: string[];
  confirmed?: boolean;
}

describe('DetailsCategoryComponent', () => {
  async function setup({config = {}, customization = {}, permissions = ['categories:role#update'], confirmed = true}: Setup = {}) {
    TestBed.configureTestingModule({
      imports: [DetailsCategoryComponent],
      providers: [
        ...provideJuicebarTesting(),
        CategoriesTranslationPipe,
        {provide: CATEGORIES_CUSTOMIZATION, useValue: customization},
        {provide: ActivatedRoute, useValue: {parent: {snapshot: {paramMap: convertToParamMap({id: 'food'})}}}},
      ],
    });
    signInTestUser();
    const juicebox = TestBed.inject(JuiceboxService);
    vi.spyOn(juicebox, 'hasPermission').mockImplementation(permission => permissions.includes(permission));
    vi.spyOn(juicebox, 'getLoggedInOrganisation').mockResolvedValue({_id: 'org-1'});
    vi.spyOn(TestBed.inject(ConfigurationService), 'getByKey').mockResolvedValue({success: true, payload: {options: config}});
    vi.spyOn(TestBed.inject(Juice), 'request').mockResolvedValue(['org-1']);
    const dialog = vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({closed: of(confirmed)} as any);
    const categories = TestBed.inject(CategoriesService);
    vi.spyOn(categories, 'getCategory').mockResolvedValue({success: true, payload: stored});
    const update = vi.spyOn(categories, 'updateCategory').mockResolvedValue({success: true, payload: {...stored, active: false}});
    const usage = vi.spyOn(categories, 'getCategoryUsage').mockResolvedValue({
      qualifications: 2, modules: 0, trainings: 1, educations: 0, templates: 0, occupations: 0, functions: 0,
    });
    const fixture = TestBed.createComponent(DetailsCategoryComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    for (let step = 0; step < 3; step++) await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance as any;
    const save = async () => {
      element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      for (let step = 0; step < 3; step++) await new Promise(resolve => setTimeout(resolve));
      await fixture.whenStable();
    };
    return {element, component, save, update, dialog, usage};
  }

  it('sends the fields in the user\'s language, as the old tab did', async () => {
    const {component, save, update} = await setup();
    expect(component.form.getRawValue()).toEqual({name: 'Food', description: '', order: 0, active: true, public: false});
    await save();
    expect(update).toHaveBeenCalledWith('food', {name: 'Food', description: '', order: 0, active: true}, 'en_GB');
  });

  it('can\'t save without the permission', async () => {
    const {element} = await setup({permissions: []});
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
  });

  it('Quality Circle (confirmDeactivation): names what uses the category before switching it off', async () => {
    const {component, save, update, dialog, usage} = await setup({customization: {options: {confirmDeactivation: true}}});
    component.form.controls.active.setValue(false);
    await save();
    expect(usage).toHaveBeenCalledWith('food');
    expect((dialog.mock.calls[0][1] as any).data.info).toContain('2 qualifications, 1 trainings');
    expect(update).toHaveBeenCalledWith('food', expect.objectContaining({active: false}), 'en_GB');
  });

  it('Quality Circle (confirmDeactivation): cancelling switches it back on and saves nothing', async () => {
    const {component, save, update} = await setup({customization: {options: {confirmDeactivation: true}}, confirmed: false});
    component.form.controls.active.setValue(false);
    await save();
    expect(update).not.toHaveBeenCalled();
    expect(component.form.controls.active.value).toBe(true);
  });

  it('Quality Circle (showPublic): another organisation\'s category can be taken into Mine, not saved', async () => {
    const {element} = await setup({config: {showPublic: true}});
    expect(element.textContent).toContain('Transfer to Mine');
    // org-2 is outside the user's organisation tree
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
  });

  it('Quality Circle (showPublic, allowDelete off): a super admin saves any category, with its public switch', async () => {
    const {save, update} = await setup({
      config: {showPublic: true, allowDelete: false},
      permissions: ['categories:role#super-admin'],
    });
    await save();
    expect(update).toHaveBeenCalledWith('food', expect.objectContaining({public: false}), 'en_GB');
  });
});
