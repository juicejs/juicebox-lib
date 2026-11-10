import {TestBed} from '@angular/core/testing';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {CATEGORIES_CUSTOMIZATION, CategoriesCustomization} from '../../../../config/base-app.config';
import {provideJuicebarTesting, signInTestUser} from '../../../../../testing/juicebar-testing';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {CategoriesService} from '../categories.service';
import {CategoriesTranslationPipe} from '../i18n/categories.translation';
import {ChildCategoryDialogComponent, ChildCategoryDialogData} from './child-category-dialog.component';

describe('ChildCategoryDialogComponent', () => {
  async function setup(data: Partial<ChildCategoryDialogData> = {}, customization: CategoriesCustomization = {}) {
    const close = vi.fn();
    TestBed.configureTestingModule({
      imports: [ChildCategoryDialogComponent],
      providers: [
        ...provideJuicebarTesting(),
        CategoriesTranslationPipe,
        {provide: CATEGORIES_CUSTOMIZATION, useValue: customization},
        {provide: DialogRef, useValue: {close}},
        {provide: DIALOG_DATA, useValue: {parentId: 'food', order: 2, ...data}},
      ],
    });
    signInTestUser();
    const juicebox = TestBed.inject(JuiceboxService);
    juicebox.setUser({...juicebox.getUser(), roles: [{role: 'categories:role', permissions: {create: true}}]});
    const create = vi.spyOn(TestBed.inject(CategoriesService), 'createCategory').mockResolvedValue({success: true, payload: 'new-id'});
    const fixture = TestBed.createComponent(ChildCategoryDialogComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const submit = async (name: string) => {
      const input = element.querySelector<HTMLInputElement>('input[formcontrolname="name"]')!;
      input.value = name;
      input.dispatchEvent(new Event('input'));
      element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve));
    };
    return {element, create, close, submit};
  }

  it('creates an inactive subcategory at the parent\'s end in the user\'s language, as the old dialog sent it', async () => {
    const {create, close, submit, element} = await setup();
    // Shown counted from 1
    expect(element.querySelector<HTMLInputElement>('input[formcontrolname="order"]')!.value).toBe('3');
    await submit('Cheese');
    expect(create).toHaveBeenCalledWith({name: 'Cheese', description: null, active: false, order: 2, parent_id: 'food'}, 'en_GB');
    expect(close).toHaveBeenCalledWith('new-id');
  });

  it('sends nothing without a name, which the old dialog did', async () => {
    const {create, submit} = await setup();
    await submit('');
    expect(create).not.toHaveBeenCalled();
  });

  it('Quality Circle: active by default, and public with showPublic', async () => {
    const {create, submit} = await setup({showPublic: true}, {options: {subcategoriesActive: true}});
    await submit('Cheese');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({active: true, public: false}), 'en_GB');
  });
});
