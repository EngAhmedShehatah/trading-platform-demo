import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TradingGridComponent } from './trading-grid.component';

describe('TradingGridComponent', () => {
  let component: TradingGridComponent;
  let fixture: ComponentFixture<TradingGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradingGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TradingGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
