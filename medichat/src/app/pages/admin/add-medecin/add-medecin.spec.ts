import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMedecin } from './add-medecin';

describe('AddMedecin', () => {
  let component: AddMedecin;
  let fixture: ComponentFixture<AddMedecin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMedecin],
    }).compileComponents();

    fixture = TestBed.createComponent(AddMedecin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
