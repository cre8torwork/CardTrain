import type { Category } from '../hooks/useCategoryStore';

export const mockCategories: Category[] = [
  { id: 'cat-001', name: '寶可夢卡', nameZhCn: '宝可梦卡', nameEn: 'Pokemon Cards', nameJa: 'ポケモンカード', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-002', name: '航海王卡', nameZhCn: '航海王卡', nameEn: 'One Piece Cards', nameJa: 'ワンピースカード', createdAt: '2024-01-02T00:00:00Z' },
  { id: 'cat-003', name: '遊戲王卡', nameZhCn: '游戏王卡', nameEn: 'Yu-Gi-Oh! Cards', nameJa: '遊戯王カード', createdAt: '2024-01-03T00:00:00Z' },
];