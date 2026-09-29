import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-search-pagination-bar',
  templateUrl: './search-pagination-bar.component.html',
  standalone: false
})
export class SearchPaginationBarComponent {

  // ── Recherche ──────────────────────────────────────────
  @Input() searchInput = '';
  @Input() searchPlaceholder = 'Rechercher...';
  @Output() searchInputChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  // ── Tri ────────────────────────────────────────────────
  @Input() sortBy = 'recent';
  @Input() sortOptions: { value: string; label: string }[] = [
    { value: 'recent', label: 'Plus récentes' },
    { value: 'oldest', label: 'Plus anciennes' },
    { value: 'likes',  label: 'Plus aimées' },
  ];
  @Output() sortByChange = new EventEmitter<string>();
  @Output() sortChange   = new EventEmitter<void>();

  // ── Pagination ─────────────────────────────────────────
  @Input() currentPage = 1;
  @Input() totalPages  = 1;
  @Input() pagesArray: number[] = [1];
  @Input() totalResults = 0;
  @Output() pageChange = new EventEmitter<number>();

  onSearchInputChange(value: string): void {
    this.searchInput = value;
    this.searchInputChange.emit(value);
    this.search.emit();
  }

  onClear(): void {
    this.searchInput = '';
    this.searchInputChange.emit('');
    this.clear.emit();
  }

  onSortByChange(value: string): void {
    this.sortBy = value;
    this.sortByChange.emit(value);
    this.sortChange.emit();
  }

  onGoToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.pageChange.emit(page);
  }
}