import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecialitesList } from './specialites-list';

describe('SpecialitesList', () => {
  let component: SpecialitesList;
  let fixture: ComponentFixture<SpecialitesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecialitesList],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecialitesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
