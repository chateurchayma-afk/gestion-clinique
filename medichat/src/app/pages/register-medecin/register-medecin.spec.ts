import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterMedecin } from './register-medecin';

describe('RegisterMedecin', () => {
  let component: RegisterMedecin;
  let fixture: ComponentFixture<RegisterMedecin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterMedecin],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterMedecin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
