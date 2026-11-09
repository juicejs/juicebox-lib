import {escapeHtml, fileUrl, withText} from './media-files';

describe('media files', () => {
  it('fileUrl: a full address as it is, a backend path under the endpoint, with or without `public/`', () => {
    expect(fileUrl('https://cdn.test/a.png', 'https://api.test')).toBe('https://cdn.test/a.png');
    expect(fileUrl('media/pages/1/a.png', 'https://api.test')).toBe('https://api.test/media/pages/1/a.png');
    expect(fileUrl('public/media/a.png', 'https://api.test')).toBe('https://api.test/media/a.png');
    expect(fileUrl('/public/media/a.png', 'https://api.test')).toBe('https://api.test/media/a.png');
    expect(fileUrl('publications/a.png', 'https://api.test')).toBe('https://api.test/publications/a.png');
    expect(fileUrl(undefined, 'https://api.test')).toBeNull();
  });

  it('withText: edits one language and keeps the others; an empty detail is null', () => {
    expect(withText({de_DE: 'Eins'}, 'en_GB', 'One')).toEqual({de_DE: 'Eins', en_GB: 'One'});
    expect(withText({de_DE: 'Eins', en_GB: 'One'}, 'en_GB', '')).toEqual({de_DE: 'Eins'});
    expect(withText({en_GB: 'One'}, 'en_GB', '')).toBeNull();
    expect(withText(null, 'en_GB', '')).toBeNull();
  });

  it('escapeHtml: shows markup as text', () => {
    expect(escapeHtml('<b>"a" & b</b>')).toBe('&lt;b&gt;&quot;a&quot; &amp; b&lt;/b&gt;');
  });
});
