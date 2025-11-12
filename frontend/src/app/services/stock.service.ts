import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

export interface Stock {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface GraphQLResponse {
  data: {
    allStocks: Stock[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private readonly GRAPHQL_ENDPOINT =
    'https://trading-platform-backend-j75o.onrender.com/';

  constructor(private http: HttpClient) {}

  getAllStocks(): Observable<Stock[]> {
    // Poll every 2 seconds
    return interval(2000).pipe(
      startWith(0), // Start immediately
      switchMap(() => this.fetchStocks())
    );
  }

  private fetchStocks(): Observable<Stock[]> {
    const query = `
      query GetAllStocks {
        allStocks {
          symbol
          price
          volume
          change
          changePercent
          timestamp
        }
      }
    `;

    return new Observable<Stock[]>((observer) => {
      this.http
        .post<GraphQLResponse>(this.GRAPHQL_ENDPOINT, { query })
        .subscribe({
          next: (response) => {
            observer.next(response.data.allStocks);
          },
          error: (error) => {
            console.error('Error fetching stocks:', error);
            observer.error(error);
          },
        });
    });
  }
}
