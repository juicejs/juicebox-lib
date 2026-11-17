import {TestBed} from '@angular/core/testing';
import {ActivatedRoute} from '@angular/router';
import {provideJuicebarTesting, settle, signInTestUser} from '../../../../../../testing/juicebar-testing';
import {EntitiesService} from '../../entities.service';
import {Entity} from '../../entities.types';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';
import {PaymentEntityComponent} from './payment-entity.component';

describe('PaymentEntityComponent', () => {
  async function setup(attributes: Record<string, unknown>) {
    const organisation: Entity = {_id: 'org', type: 'organisation', name: 'Acme', attributes};
    TestBed.configureTestingModule({
      imports: [PaymentEntityComponent],
      providers: [
        ...provideJuicebarTesting(),
        EntitiesTranslationPipe,
        {provide: ActivatedRoute, useValue: {snapshot: {parent: {params: {id: 'org'}}}}},
      ],
    });
    signInTestUser();
    const entities = TestBed.inject(EntitiesService);
    vi.spyOn(entities, 'get').mockResolvedValue({success: true, payload: organisation});
    const check = vi.spyOn(entities, 'checkDetailsSubmitted').mockResolvedValue({success: true, payload: {detailsSubmitted: true}});
    const update = vi.spyOn(entities, 'updateAttributes').mockResolvedValue({success: true});
    const fixture = TestBed.createComponent(PaymentEntityComponent);
    fixture.autoDetectChanges();
    await settle(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const field = (name: string) => element.querySelector<HTMLInputElement>(`input[formcontrolname="${name}"]`)!;
    const type = (name: string, value: string) => {
      field(name).value = value;
      field(name).dispatchEvent(new Event('input'));
    };
    const save = () => [...element.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent!.trim() === 'Save')!;
    return {fixture, element, check, update, field, type, save};
  }

  it('tells an organisation without an account so, without asking the payment provider', async () => {
    const {element, check} = await setup({});
    expect(element.textContent).toContain('Vendor does not have connected stripe account.');
    expect(check).not.toHaveBeenCalled();
  });

  it('asks the payment provider about an account and tells it is connected', async () => {
    const {element, check} = await setup({account_id: 'acct_1'});
    expect(check).toHaveBeenCalledWith('org');
    expect(element.textContent).toContain('Vendor has connected stripe account');
  });

  it('switches Save off for a platform fee over 10', async () => {
    const {fixture, type, save} = await setup({fee: 3.6});
    expect(save().disabled).toBe(false);
    type('fee', '11');
    await settle(fixture);
    expect(save().disabled).toBe(true);
  });

  it('sends all the attributes, a changed fee as typed and an untouched one as it is stored, also one stored as a text', async () => {
    const {fixture, update, field, type, save} = await setup({account_id: 'acct_1', fee: '3.6'});
    expect(field('fee').value).toBe('3.6');
    type('article_fee', '0.25');
    await settle(fixture);
    save().click();
    await settle(fixture);
    expect(update).toHaveBeenCalledWith('org', {account_id: 'acct_1', fee: '3.6', article_fee: 0.25});
  });
});
