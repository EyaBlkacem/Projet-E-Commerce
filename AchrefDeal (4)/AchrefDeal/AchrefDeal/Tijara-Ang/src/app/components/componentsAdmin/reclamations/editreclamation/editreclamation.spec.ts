import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Editreclamation } from './editreclamation';

describe('Editreclamation', () => {
  let component: Editreclamation;
  let fixture: ComponentFixture<Editreclamation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Editreclamation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Editreclamation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
