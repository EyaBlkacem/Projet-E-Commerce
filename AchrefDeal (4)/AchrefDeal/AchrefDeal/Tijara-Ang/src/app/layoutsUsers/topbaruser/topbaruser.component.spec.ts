import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopbarUserComponent } from './topbaruser.component';

describe('TopbarUserComponent', () => {
  let component: TopbarUserComponent;
  let fixture: ComponentFixture<TopbarUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopbarUserComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TopbarUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
