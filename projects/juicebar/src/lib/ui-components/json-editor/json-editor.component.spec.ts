import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {JsonEditorComponent} from './json-editor.component';
import {jsonErrorOffset, lineAt, tokenizeJson} from './json-syntax';

describe('json syntax', () => {
  it('finds no error in JSON and the place where other text stops being JSON', () => {
    expect(jsonErrorOffset('{"key": "networking", "options": [1, -2.5e3, true, null]}')).toBeNull();
    expect(jsonErrorOffset('{"key": "a",}')).toBe(12);
    expect(jsonErrorOffset('{"key": "a" "name": "b"}')).toBe(12);
    expect(jsonErrorOffset('{"key": tru}')).toBe(8);
    expect(jsonErrorOffset('{"a": "\\x"}')).toBe(8);
    expect(jsonErrorOffset('{"a": 1} x')).toBe(9);
    expect(jsonErrorOffset('')).toBe(0);
  });

  it('counts the line of an offset', () => {
    const text = '{\n  "key": "a",\n}';
    expect(lineAt(text, jsonErrorOffset(text)!)).toBe(3);
  });

  it('cuts the text into coloured pieces that join back into the text', () => {
    const text = '{"key": "value", "n": 12, "on": true}\n  oops';
    const tokens = tokenizeJson(text);
    expect(tokens.map(token => token.text).join('')).toBe(text);
    expect(tokens.filter(token => token.kind).map(token => `${token.kind}:${token.text}`)).toEqual([
      'punctuation:{', 'key:"key"', 'punctuation::', 'string:"value"', 'punctuation:,',
      'key:"n"', 'punctuation::', 'number:12', 'punctuation:,',
      'key:"on"', 'punctuation::', 'literal:true', 'punctuation:}',
    ]);
  });
});

@Component({
  imports: [JsonEditorComponent, ReactiveFormsModule],
  template: `<app-json-editor [formControl]="control" />`,
})
class HostComponent {
  readonly control = new FormControl<unknown>({key: null, name: null});
}

describe('JsonEditorComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const textarea = element.querySelector('textarea')!;
    const type = async (text: string) => {
      textarea.value = text;
      textarea.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return {fixture, element, textarea, type, host: fixture.componentInstance};
  }

  it('shows the form value as indented JSON, coloured', async () => {
    const {element, textarea} = await setup();
    expect(textarea.value).toBe('{\n  "key": null,\n  "name": null\n}');
    expect(element.querySelector('.app-json-editor__key')!.textContent).toBe('"key"');
    expect(element.querySelectorAll('.app-json-editor__line-number').length).toBe(4);
  });

  it('gives the form the JSON typed, and keeps the last JSON while the text is not JSON', async () => {
    const {element, type, host, fixture} = await setup();
    await type('{"key": "a", "name": "A"}');
    expect(host.control.value).toEqual({key: 'a', name: 'A'});
    expect(fixture.debugElement.children[0].componentInstance.valid()).toBe(true);
    expect(host.control.hasError('invalidJson')).toBe(false);

    await type('{"key": "a",\n "name": }');
    expect(host.control.value).toEqual({key: 'a', name: 'A'});
    expect(fixture.debugElement.children[0].componentInstance.valid()).toBe(false);
    expect(host.control.hasError('invalidJson')).toBe(true);
    expect(element.querySelector('.app-json-editor__status')!.textContent).toContain('Invalid JSON · Line 2');
    expect(element.querySelector('.app-json-editor__line-number--error')!.textContent).toBe('2');
  });

  it('leaves Enter to an input method that is composing, and leaves Tab alone', async () => {
    const {textarea} = await setup();
    const composing = new KeyboardEvent('keydown', {key: 'Enter', isComposing: true, cancelable: true});
    textarea.dispatchEvent(composing);
    expect(composing.defaultPrevented).toBe(false);
    const tab = new KeyboardEvent('keydown', {key: 'Tab', cancelable: true});
    textarea.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it('shows an empty editor for nothing, without an error', async () => {
    const {element, textarea, host, fixture} = await setup();
    host.control.setValue(null);
    await fixture.whenStable();
    expect(textarea.value).toBe('');
    expect(element.querySelector('.app-json-editor__status')).toBeNull();
  });
});
