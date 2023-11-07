import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ComponentStore } from '@ngrx/component-store';
import { Store } from '@ngrx/store';
import {
  combineLatest,
  debounceTime,
  filter,
  interval,
  map,
  repeat,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { tableChanges } from './table-multiplication.actions';
import { Multiplication, TABLES } from './table-multiplication.constante';
import { AppState } from './table-multiplication.selectors';

export interface TableMultiplicationState {
  tables: Multiplication[];
  answer: string;
  count: number;
  indicateur: Indicateur;
  counter: number;
}

export interface Indicateur {
  icon: 'task_alt' | 'error' | '...';
  color: 'text-green-700' | 'text-orange-900' | 'text-black';
}

export const indicateurValid: Indicateur = {
  icon: 'task_alt',
  color: 'text-green-700',
};
export const indicateurError: Indicateur = {
  icon: 'error',
  color: 'text-orange-900',
};
export const indicateurWaiting: Indicateur = {
  icon: '...',
  color: 'text-black',
};

export const initialTableMultiplicationState: TableMultiplicationState = {
  tables: TABLES,
  answer: '',
  count: 0,
  indicateur: indicateurWaiting,
  counter: 5,
};

@Injectable()
export class TableMultiplicationComponentStore extends ComponentStore<TableMultiplicationState> {
  #router = inject(Router);
  #store = inject(Store<AppState>);
  readonly tables$ = this.select((state) => state.tables);
  readonly answer$ = this.select((state) => state.answer);
  readonly count$ = this.select((state) => state.count);
  readonly indicateur$ = this.select((state) => state.indicateur);
  readonly counter$ = this.select((state) => state.counter);

  constructor() {
    super(initialTableMultiplicationState);
    this.counter();
    this.navigate();
  }

  readonly updateIndicateur = this.updater((state, indicateur: Indicateur) => ({
    ...state,
    indicateur,
  }));

  readonly validate: any = this.effect<void>((source$) =>
    source$.pipe(
      switchMap(() => combineLatest([this.tables$, this.answer$, this.count$])),
      tap(([tables, answer, count]) =>
        this.#store.dispatch(
          tableChanges({ table: { ...tables[count], answer: +answer } })
        )
      ),
      map(([tables, answer, count]) => tables[count]?.result === +answer),
      tap((valid) =>
        this.updateIndicateur(valid ? indicateurValid : indicateurError)
      ),
      debounceTime(1000),

      tap(() => this.patchState(({ count }) => ({ count: count + 1 }))),
      tap(() => this.patchState({ answer: '' })),
      tap(() => this.updateIndicateur(indicateurWaiting)),
      tap(() => this.patchState({ counter: 5 })),
      tap(() => this.counter()),
      take(1),
      repeat()
    )
  );

  readonly counter = this.effect<void>((source$) =>
    source$.pipe(
      switchMap(() =>
        interval(1000).pipe(
          tap(() =>
            this.patchState(({ counter }) => ({ counter: counter - 1 }))
          ),
          filter((index) => index === 4),
          tap(() => this.validate())
        )
      ),
      take(1),
      repeat()
    )
  );

  readonly navigate = this.effect<void>((source$) =>
    source$.pipe(
      switchMap(() =>
        combineLatest([this.tables$, this.count$]).pipe(
          tap(([tables, count]) => {
            if (tables.length === count) {
              this.#router.navigate(['result']);
            }
          })
        )
      )
    )
  );
}