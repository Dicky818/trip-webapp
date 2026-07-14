import { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Square, Plus, Trash2, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Trip } from '../../api/supabaseApi';
import { Button, Input, EmptyState } from '../../components/ui';

interface PackingItem {
  id: string;
  name: string;
  checked: boolean;
  category: string;
}

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  '證件與文件': ['護照', '身份證', '機票列印', '酒店確認信', '旅遊保險', '簽證'],
  '衣物': ['上衣', '褲子', '內衣褲', '襪子', '外套', '睡衣', '泳衣'],
  '電子產品': ['手機充電器', '行動電源', '轉接插頭', '耳機', '相機'],
  '盥洗用品': ['牙刷牙膏', '洗面乳', '防曬乳', '護膚品', '毛巾'],
  '藥品與健康': ['常備藥物', '暈車藥', 'OK繃', '口罩'],
  '其他': ['雨傘', '水壺', '零食', '筆記本'],
};

interface Props { trip: Trip; }

export default function PackingListTab({ trip }: Props) {
  const storageKey = `packing_${trip.Trip_ID}`;

  const [items, setItems] = useState<PackingItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('其他');

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  // Group items by category
  const grouped = useMemo(() => {
    const map: Record<string, PackingItem[]> = {};
    items.forEach(item => {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    });
    return map;
  }, [items]);

  const categories = Object.keys(grouped).sort((a, b) => {
    const order = Object.keys(DEFAULT_CATEGORIES);
    return (order.indexOf(a) === -1 ? 999 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 999 : order.indexOf(b));
  });

  // Progress
  const totalItems = items.length;
  const checkedItems = items.filter(i => i.checked).length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const addItem = () => {
    if (!newItemName.trim()) return;
    setItems(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name: newItemName.trim(),
      checked: false,
      category: newItemCategory,
    }]);
    setNewItemName('');
    setShowAddItem(false);
  };

  const loadDefaults = () => {
    const newItems: PackingItem[] = [];
    Object.entries(DEFAULT_CATEGORIES).forEach(([cat, names]) => {
      names.forEach(name => {
        if (!items.some(i => i.name === name && i.category === cat)) {
          newItems.push({
            id: Date.now().toString() + Math.random().toString(36).slice(2) + name,
            name,
            checked: false,
            category: cat,
          });
        }
      });
    });
    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems]);
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  return (
    <div className="p-5 space-y-4">
      {/* Progress Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">行李準備進度</span>
          </div>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          已確認 {checkedItems} / {totalItems} 項物品
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => setShowAddItem(true)}>
          <Plus size={14} /> 新增物品
        </Button>
        {items.length === 0 && (
          <Button size="sm" onClick={loadDefaults}>
            <Package size={14} /> 載入預設清單
          </Button>
        )}
        {items.length > 0 && (
          <Button size="sm" variant="ghost" onClick={loadDefaults}>
            補充預設項目
          </Button>
        )}
      </div>

      {/* Add Item Inline */}
      {showAddItem && (
        <div className="flex gap-2 items-end bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div className="flex-1">
            <Input
              label="物品名稱"
              placeholder="例如：充電線"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
            />
          </div>
          <div className="w-32">
            <label className="text-sm font-medium text-slate-700 block mb-1">分類</label>
            <select
              value={newItemCategory}
              onChange={e => setNewItemCategory(e.target.value)}
              className="w-full px-2 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {Object.keys(DEFAULT_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={addItem}>新增</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAddItem(false)}>取消</Button>
        </div>
      )}

      {/* Packing List */}
      {totalItems === 0 ? (
        <EmptyState
          icon={<Package size={48} />}
          title="尚無行李清單"
          description="點擊「載入預設清單」快速建立，或手動新增物品"
        />
      ) : (
        <div className="space-y-3">
          {categories.map(cat => {
            const catItems = grouped[cat];
            const catChecked = catItems.filter(i => i.checked).length;
            const isCollapsed = collapsedCategories.has(cat);
            return (
              <div key={cat} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    <span className="text-sm font-medium text-slate-800">{cat}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catChecked === catItems.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {catChecked}/{catItems.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100">
                    {catItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group">
                        <button onClick={() => toggleItem(item.id)} className="flex-shrink-0">
                          {item.checked
                            ? <CheckSquare size={18} className="text-emerald-500" />
                            : <Square size={18} className="text-slate-300" />
                          }
                        </button>
                        <span className={`flex-1 text-sm ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {item.name}
                        </span>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-1 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
