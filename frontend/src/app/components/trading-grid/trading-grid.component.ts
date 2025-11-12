import { Component, OnDestroy, OnInit } from '@angular/core';
import { Stock, StockService } from '../../services/stock.service';
import { Subscription } from 'rxjs';
import { ColDef, GridOptions } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';

@Component({
  selector: 'app-trading-grid',
  standalone: true,
  imports: [CommonModule, AgGridAngular],
  templateUrl: './trading-grid.component.html',
  styleUrl: './trading-grid.component.scss',
})
export class TradingGridComponent implements OnInit, OnDestroy {
  rowData: Stock[] = [];
  private subscription?: Subscription;

  columnDefs: ColDef[] = [
    {
      field: 'symbol',
      headerName: 'Symbol',
      width: 120,
      pinned: 'left',
      cellStyle: { fontWeight: 'bold' },
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 130,
      valueFormatter: (params) => `$${params.value.toFixed(2)}`,
      cellClass: (params) => {
        if (params.data.changePercent > 0) return 'price-up';
        if (params.data.changePercent < 0) return 'price-down';
        return 'price-neutral';
      },
    },
    {
      field: 'change',
      headerName: 'Change',
      width: 130,
      valueFormatter: (params) =>
        `${params.value >= 0 ? '+' : ''}$${params.value.toFixed(2)}`,
      cellClass: (params) => (params.value >= 0 ? 'price-up' : 'price-down'),
    },
    {
      field: 'changePercent',
      headerName: 'Change %',
      width: 140,
      valueFormatter: (params) =>
        `${params.value >= 0 ? '+' : ''}${params.value.toFixed(2)}%`,
      cellClass: (params) => (params.value >= 0 ? 'price-up' : 'price-down'),
    },
    {
      field: 'volume',
      headerName: 'Volume',
      width: 150,
      valueFormatter: (params) => params.value.toLocaleString(),
    },
    {
      field: 'timestamp',
      headerName: 'Last Update',
      width: 200,
      valueFormatter: (params) => new Date(params.value).toLocaleTimeString(),
    },
  ];

  gridOptions: GridOptions = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
    },
    animateRows: true,
    rowSelection: 'single',
    suppressBrowserResizeObserver: true,
    suppressPropertyNamesCheck: true,
  };

  constructor(private stockService: StockService) {}

  ngOnInit() {
    this.subscription = this.stockService.getAllStocks().subscribe({
      next: (stocks) => {
        this.rowData = stocks;
        console.log('📊 Received stock data:', stocks.length, 'stocks');
      },
      error: (error) => {
        console.error('❌ Error fetching stocks:', error);
      },
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
