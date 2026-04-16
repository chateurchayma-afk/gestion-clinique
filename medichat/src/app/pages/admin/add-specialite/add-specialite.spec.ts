import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSpecialite } from './add-specialite';

describe('AddSpecialite', () => {
  let component: AddSpecialite;
  let fixture: ComponentFixture<AddSpecialite>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSpecialite],
    }).compileComponents();

    fixture = TestBed.createComponent(AddSpecialite);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
