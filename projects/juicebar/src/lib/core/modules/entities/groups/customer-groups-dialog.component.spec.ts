import {DialogRef} from '@angular/cdk/dialog';
import {TestBed} from '@angular/core/testing';
import {provideJuicebarTesting, settle, signInTestUser} from '../../../../../testing/juicebar-testing';
import {EntitiesService} from '../entities.service';
import {EntitiesTranslationPipe} from '../i18n/entities.translation';
import {CustomerGroupsDialogComponent} from './customer-groups-dialog.component';

describe('CustomerGroupsDialogComponent', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [CustomerGroupsDialogComponent],
      providers: [...provideJuicebarTesting(), EntitiesTranslationPipe, {provide: DialogRef, useValue: {close: vi.fn()}}],
    });
    signInTestUser();
    const entities = TestBed.inject(EntitiesService);
    vi.spyOn(entities, 'fetchEntityGroups').mockResolvedValue({success: true, payload: {count: 1, items: [{_id: 'vip', name: 'VIP'}]}});
    // Answers only when the test lets it, as a slow backend would
    let answer!: () => void;
    const create = vi.spyOn(entities, 'createNewEntityGroup').mockImplementation(() =>
      new Promise(resolve => answer = () => resolve({success: true, payload: {_id: 'new', name: 'Gold'}})));
    const fixture = TestBed.createComponent(CustomerGroupsDialogComponent);
    fixture.autoDetectChanges();
    await settle(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('input')!;
    const typeName = (name: string) => {
      input.value = name;
      input.dispatchEvent(new Event('input'));
    };
    const enter = (init: KeyboardEventInit = {}) => input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', ...init}));
    return {fixture, element, input, create, typeName, enter, answer: () => answer()};
  }

  it('lists the organisation\'s groups', async () => {
    const {element} = await setup();
    expect(element.querySelector('tbody tr')!.textContent).toContain('VIP');
  });

  it('adds a group once when Enter is held or pressed again before the backend answered', async () => {
    const {fixture, input, create, typeName, enter, answer} = await setup();
    typeName('Gold');
    enter();
    enter({repeat: true});
    enter();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith('Gold');
    answer();
    await settle(fixture);
    // The field is emptied for the next group
    expect(input.value).toBe('');
  });

  it('does not add while a text is still being composed', async () => {
    const {create, typeName, enter} = await setup();
    typeName('金');
    enter({isComposing: true});
    expect(create).not.toHaveBeenCalled();
  });
});
