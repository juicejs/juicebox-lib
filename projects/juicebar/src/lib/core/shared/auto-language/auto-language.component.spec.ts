import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {AutoLanguageComponent} from './auto-language.component';

describe('AutoLanguageComponent', () => {
  let component: AutoLanguageComponent;
  let fixture: ComponentFixture<AutoLanguageComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AutoLanguageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AutoLanguageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
