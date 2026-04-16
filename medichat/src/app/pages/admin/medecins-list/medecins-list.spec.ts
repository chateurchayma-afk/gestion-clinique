import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedecinsList } from './medecins-list';

describe('MedecinsList', () => {
  let component: MedecinsList;
  let fixture: ComponentFixture<MedecinsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedecinsList],
    }).compileComponents();

    fixture = TestBed.createComponent(MedecinsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
