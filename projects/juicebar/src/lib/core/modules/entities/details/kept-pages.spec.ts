import {Type} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute} from '@angular/router';
import {provideJuicebarTesting, settle, signInTestUser} from '../../../../../testing/juicebar-testing';
import {EntitiesService} from '../entities.service';
import {Entity} from '../entities.types';
import {EntitiesTranslationPipe} from '../i18n/entities.translation';
import {AddlogoEntitiesComponent} from './addlogo-entities/addlogo-entities.component';
import {DocumentsEntityComponent} from './documents-entity/documents-entity.component';

/** The old juicebox's pages of a customer that no tab leads to, kept for the projects that link to them */
describe('a customer\'s pages without a tab', () => {
  async function setup<T>(component: Type<T>, customer: Entity) {
    TestBed.configureTestingModule({
      imports: [component],
      providers: [
        ...provideJuicebarTesting(),
        EntitiesTranslationPipe,
        {provide: ActivatedRoute, useValue: {snapshot: {parent: {params: {id: customer._id}}}}},
      ],
    });
    signInTestUser();
    const entities = TestBed.inject(EntitiesService);
    vi.spyOn(entities, 'get').mockResolvedValue({success: true, payload: customer});
    const fetchFile = vi.spyOn(entities, 'fetchFile').mockImplementation(async () => new Blob(['file']));
    const uploadFormFile = vi.spyOn(entities, 'uploadFormImage').mockResolvedValue(true);
    const uploadLogo = vi.spyOn(entities, 'uploadImage').mockResolvedValue({success: true, payload: customer});
    const fixture = TestBed.createComponent(component);
    fixture.autoDetectChanges();
    await settle(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const choose = async (file: File) => {
      const input = element.querySelector<HTMLInputElement>('input[type=file]')!;
      Object.defineProperty(input, 'files', {configurable: true, value: [file]});
      input.dispatchEvent(new Event('change'));
      await settle(fixture);
    };
    return {fixture, element, fetchFile, uploadFormFile, uploadLogo, choose};
  }

  describe('form files (documents-entity)', () => {
    const customer: Entity = {
      _id: 'c1',
      form_data: 'entry-7',
      attributes: {files: [
        {_id: 'f1', name: 'passport.png', mimetype: 'image/png'},
        {_id: 'f2', name: 'contract.pdf', mimetype: 'application/pdf'},
      ]},
    };

    it('shows the images as pictures and the other files by name with a download', async () => {
      const {element, fetchFile} = await setup(DocumentsEntityComponent, customer);
      expect(fetchFile).toHaveBeenCalledWith('c1', 'f1');
      expect(fetchFile).toHaveBeenCalledWith('c1', 'f2');
      const picture = element.querySelector<HTMLImageElement>('img.documents-thumb')!;
      expect(picture.src).toMatch(/^blob:/);
      expect(picture.alt).toBe('passport.png');
      expect(element.textContent).toContain('contract.pdf');
      expect(element.textContent).not.toContain('There are no customer files!');
    });

    it('says so when the customer has no form files', async () => {
      const {element, fetchFile} = await setup(DocumentsEntityComponent, {_id: 'c2', attributes: {}});
      expect(element.textContent).toContain('There are no customer files!');
      expect(fetchFile).not.toHaveBeenCalled();
    });

    it('sends an uploaded file to the customer\'s form entry and reads the files again', async () => {
      const {choose, uploadFormFile, fetchFile} = await setup(DocumentsEntityComponent, customer);
      const file = new File(['x'], 'id.pdf', {type: 'application/pdf'});
      await choose(file);
      expect(uploadFormFile).toHaveBeenCalledWith('entry-7', file);
      expect(fetchFile).toHaveBeenCalledTimes(4);
    });
  });

  describe('images (addlogo-entity)', () => {
    const customer: Entity = {_id: 'o1', images: [{_id: 'i1', small: 'media/entities/o1/images/i1/small.png'}]};

    it('lists the customer\'s images by their small size', async () => {
      const {element} = await setup(AddlogoEntitiesComponent, customer);
      expect(element.querySelector<HTMLImageElement>('img.logo-thumb')!.src).toContain('/media/entities/o1/images/i1/small.png');
    });

    it('adds a chosen image, and takes no file that is not an image', async () => {
      const {choose, uploadLogo} = await setup(AddlogoEntitiesComponent, customer);
      await choose(new File(['x'], 'notes.pdf', {type: 'application/pdf'}));
      expect(uploadLogo).not.toHaveBeenCalled();
      const image = new File(['x'], 'logo.png', {type: 'image/png'});
      await choose(image);
      expect(uploadLogo).toHaveBeenCalledWith('o1', image);
    });
  });
});
