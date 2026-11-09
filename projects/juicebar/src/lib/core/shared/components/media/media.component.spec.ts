import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideJuicebarTesting} from '../../../../../testing/juicebar-testing';
import {ConfigurationService} from '../../services/configuration.service';
import {Juice} from '../../services/juice.service';
import {JuiceboxService} from '../../services/Juicebox.service';
import {MediaComponent} from './media.component';
import {MediaFile, MediaRecord, MediaUpdate} from './media.types';

const MEDIA_CONFIGURATION = {
  success: true,
  payload: {
    options: {
      collections: [{
        name: 'blogs.posts',
        mediaTypes: [{
          key: 'blog:image',
          name: 'image',
          title: {en_GB: 'Blog image'},
          types: [{name: 'image', options: {}}],
        }],
      }],
    },
  },
};

const image: MediaFile = {
  _id: 'image-1', fileName: 'one.png', mimeType: 'image/png', fullPath: 'media/blogs.posts/post-1/one.png',
  key: 'blog:image', type: 'image', title: {de_DE: 'Eins'},
};
const pdf: MediaFile = {_id: 'pdf-1', fileName: 'two.pdf', mimeType: 'application/pdf', fullPath: 'https://cdn.test/two.pdf'};
const video: MediaFile = {_id: 'video-1', fileName: 'three.mp4', mimeType: 'video/mp4', fullPath: 'public/media/three.mp4'};

@Component({
  imports: [MediaComponent],
  template: `
    <app-media
      [collection]="'blogs.posts'"
      [reference]="'post-1'"
      [model]="post()"
      [limit]="limit()"
      [enableSort]="true"
      [enableCopyUrl]="true"
      (saved)="saved.push($event)"
      (updated)="updated.push($event)"
      (removed)="removed.push($event)"
      (sorted)="sorted.push($event)"
    />
  `,
})
class HostComponent {
  post = signal<MediaRecord>({media: [image, pdf, video]});
  limit = signal<number | null>(null);
  saved: MediaFile[] = [];
  updated: MediaUpdate[] = [];
  removed: MediaFile[] = [];
  sorted: MediaFile[][] = [];
}

describe('MediaComponent', () => {
  async function setup() {
    TestBed.configureTestingModule({imports: [HostComponent], providers: provideJuicebarTesting()});
    vi.spyOn(TestBed.inject(ConfigurationService), 'getByKey').mockResolvedValue(MEDIA_CONFIGURATION);
    vi.spyOn(TestBed.inject(JuiceboxService), 'getEndPoint').mockReturnValue('https://api.test');
    const request = vi.spyOn(TestBed.inject(Juice), 'request');
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const overlay = () => document.querySelector('.cdk-overlay-container') as HTMLElement;
    const click = async (button: HTMLElement | null | undefined) => {
      button!.click();
      await fixture.whenStable();
    };
    const rowButton = (row: number, label: string) =>
      element.querySelectorAll('tbody tr')[row].querySelector<HTMLElement>(`[aria-label^="${label}"]`);
    return {fixture, host: fixture.componentInstance, element, overlay, click, rowButton, request};
  }

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:picked');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('lists the record\'s files with their media type, type and file name', async () => {
    const {element} = await setup();
    const rows = Array.from(element.querySelectorAll('tbody tr'));
    expect(rows.map(row => row.textContent)).toEqual([
      expect.stringContaining('one.png'),
      expect.stringContaining('two.pdf'),
      expect.stringContaining('three.mp4'),
    ]);
    // Documents are downloaded, images and videos previewed
    expect(rows[1].querySelector('a[download]')?.getAttribute('href')).toBe('https://cdn.test/two.pdf');
    expect(rows[0].querySelector('a[download]')).toBeNull();
  });

  it('previews an image or video next to the table, from the backend or its full address', async () => {
    const {element, click, rowButton} = await setup();
    await click(rowButton(0, 'Preview'));
    expect(element.querySelector('.media-preview img')?.getAttribute('src')).toBe('https://api.test/media/blogs.posts/post-1/one.png');
    await click(rowButton(2, 'Preview'));
    expect(element.querySelector('.media-preview video')?.getAttribute('src')).toBe('https://api.test/media/three.mp4');
  });

  it('uploads with media.store as the old dialog did, and emits the stored file', async () => {
    const {host, element, overlay, click, request, fixture} = await setup();
    const stored = {...image, _id: 'image-2'};
    request.mockResolvedValue({success: true, payload: stored});

    await click(element.querySelector<HTMLElement>('.media-toolbar button'));
    const file = new File(['png'], 'new image.png', {type: 'image/png'});
    const fileInput = overlay().querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(fileInput, 'files', {value: [file]});
    fileInput.dispatchEvent(new Event('change'));
    const title = overlay().querySelector<HTMLInputElement>('input[formcontrolname="title"]')!;
    title.value = 'New';
    title.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await click(overlay().querySelector<HTMLElement>('button[type="submit"]'));

    expect(request).toHaveBeenCalledWith('media', 'store', ['blogs.posts', 'post-1', {
      mediaType: {en_GB: 'Blog image'},
      key: 'blog:image',
      type: 'image',
      file: 'new image.png',
      name: null,
      description: null,
      title: {en_GB: 'New'},
    }], file);
    expect(host.saved).toEqual([stored]);
  });

  it('emits the edited details; a title edited in one language keeps the others', async () => {
    const {host, overlay, click, rowButton, fixture} = await setup();
    await click(rowButton(0, 'Edit'));
    const title = overlay().querySelector<HTMLInputElement>('input[formcontrolname="title"]')!;
    title.value = 'One';
    title.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await click(overlay().querySelector<HTMLElement>('button[type="submit"]'));

    expect(host.updated).toEqual([{
      reference: 'image-1',
      data: {
        name: null,
        description: null,
        title: {de_DE: 'Eins', en_GB: 'One'},
        alt_text: null,
        key: 'blog:image',
        mediaType: {en_GB: 'Blog image'},
      },
    }]);
  });

  it('emits the file to remove once the delete is confirmed', async () => {
    const {host, overlay, click, rowButton} = await setup();
    await click(rowButton(1, 'Delete'));
    expect(overlay().textContent).toContain('Delete media "two.pdf"?');
    await click(Array.from(overlay().querySelectorAll<HTMLElement>('button')).find(button => button.textContent?.trim() === 'Delete'));
    expect(host.removed).toEqual([pdf]);
  });

  it('shows a file\'s title as text in the delete question', async () => {
    const {host, overlay, click, rowButton, fixture} = await setup();
    host.post.set({media: [{...pdf, title: {en_GB: '<b>bold</b>'}}]});
    await fixture.whenStable();
    await click(rowButton(0, 'Delete'));
    expect(overlay().querySelector('.dialog-message')?.textContent).toBe('Delete media "<b>bold</b>"?');
  });

  it('keeps the add dialog open with the error when the upload fails', async () => {
    const {host, element, overlay, click, request, fixture} = await setup();
    const toast = vi.spyOn(TestBed.inject(JuiceboxService), 'showToast');
    request.mockResolvedValue({success: false, error: 'exceeded_maximum_upload_size-9 MB'});

    await click(element.querySelector<HTMLElement>('.media-toolbar button'));
    const fileInput = overlay().querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(fileInput, 'files', {value: [new File(['png'], 'big.png', {type: 'image/png'})]});
    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    await click(overlay().querySelector<HTMLElement>('button[type="submit"]'));

    expect(toast).toHaveBeenCalledWith('error', 'exceeded_maximum_upload_size-9 MB');
    expect(overlay().querySelector('app-add-media')).not.toBeNull();
    expect(host.saved).toEqual([]);
  });

  it('moves a file up or down, the first up to the end, and emits the record\'s files', async () => {
    const {host, element, click, rowButton} = await setup();
    await click(rowButton(0, 'Move up'));
    expect(host.sorted).toEqual([[pdf, video, image]]);
    expect(element.querySelector('tbody tr')?.textContent).toContain('two.pdf');
    await click(rowButton(2, 'Move down'));
    expect(host.sorted[1]).toEqual([image, pdf, video]);
  });

  it('adds no more files once the record has `limit` of them', async () => {
    const {host, element, fixture} = await setup();
    const add = element.querySelector<HTMLButtonElement>('.media-toolbar button')!;
    expect(add.disabled).toBe(false);
    host.limit.set(3);
    await fixture.whenStable();
    expect(add.disabled).toBe(true);
  });
});
