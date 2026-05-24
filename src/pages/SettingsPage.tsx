import React, { useState, useEffect } from 'react';
import { Settings, User, Tag, Plus, X, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, Category } from '../api/supabaseApi';
import { Button, Card, Input, Modal, ConfirmDialog, Badge, Spinner } from '../components/ui';

export default function SettingsPage() {
  const { isConfigured, userProfile, fetchUserProfile, profileLoading, categories, fetchCategories, categoriesLoading, showToast } = useApp();

  // Display name state
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Categories state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCat, setNewCat] = useState({ Main_Category: '', Sub_Category: '' });
  const [addingCat, setAddingCat] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (userProfile) {
      setDisplayNameInput(userProfile.Display_Name || '');
    }
  }, [userProfile]);

  const handleSaveDisplayName = async () => {
    if (!displayNameInput.trim()) {
      showToast('請輸入顯示名稱', 'error');
      return;
    }
    setSavingName(true);
    try {
      await api.upsertUserProfile(displayNameInput.trim());
      showToast('顯示名稱已儲存');
      await fetchUserProfile();
    } catch (e: any) {
      showToast(e.message || '儲存失敗', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCat.Main_Category.trim() || !newCat.Sub_Category.trim()) return;
    setAddingCat(true);
    try {
      await api.createCategory(newCat);
      showToast('分類已新增');
      setShowAddCategory(false);
      setNewCat({ Main_Category: '', Sub_Category: '' });
      await fetchCategories();
    } catch (e: any) {
      showToast(e.message || '新增失敗', 'error');
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeactivateCategory = async () => {
    if (!deleteCategory) return;
    setDeletingCat(true);
    try {
      await api.deactivateCategory(deleteCategory.Category_ID);
      showToast('分類已停用');
      setDeleteCategory(null);
      await fetchCategories();
    } catch (e: any) {
      showToast(e.message || '停用失敗', 'error');
    } finally {
      setDeletingCat(false);
    }
  };

  const activeCategories = categories.filter(c => String(c.Is_Active).toUpperCase() === 'TRUE');

  // 按主分類分組
  const categoryGroups: Record<string, Category[]> = {};
  activeCategories.forEach(cat => {
    if (!categoryGroups[cat.Main_Category]) categoryGroups[cat.Main_Category] = [];
    categoryGroups[cat.Main_Category].push(cat);
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">系統設定</h1>
          <p className="text-sm text-slate-500">設定個人顯示名稱和支出分類</p>
        </div>
      </div>

      {/* 個人顯示名稱 */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-blue-600" />
          <h2 className="font-semibold text-slate-900">我的顯示名稱</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          設定您在行程中的顯示名稱，用於支出分帳時識別付款人和分帳成員。
          加入或建立行程後，此名稱將自動成為您在該行程中的成員名稱。
        </p>
        {profileLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="例如：Dicky、Alex、小明"
              value={displayNameInput}
              onChange={e => setDisplayNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveDisplayName()}
              className="flex-1"
            />
            <Button onClick={handleSaveDisplayName} loading={savingName} disabled={!displayNameInput.trim()}>
              <Check size={15} /> 儲存
            </Button>
          </div>
        )}
        {userProfile?.Display_Name && (
          <p className="text-xs text-slate-400 mt-2">
            目前名稱：<span className="font-medium text-slate-600">{userProfile.Display_Name}</span>
          </p>
        )}
      </Card>

      {/* 支出分類管理 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">支出分類</h2>
          </div>
          {isConfigured && (
            <Button size="sm" variant="outline" onClick={() => setShowAddCategory(true)}>
              <Plus size={14} /> 新增分類
            </Button>
          )}
        </div>

        {categoriesLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <div className="space-y-3">
            {Object.entries(categoryGroups).map(([mainCat, subCats]) => (
              <div key={mainCat}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{mainCat}</p>
                <div className="flex flex-wrap gap-2">
                  {subCats.map(cat => (
                    <div key={cat.Category_ID} className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1">
                      <span className="text-sm text-slate-700">{cat.Sub_Category}</span>
                      <button onClick={() => setDeleteCategory(cat)}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-1">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(categoryGroups).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">尚無分類</p>
            )}
          </div>
        )}
      </Card>

      {/* 新增分類 Modal */}
      <Modal open={showAddCategory} onClose={() => setShowAddCategory(false)} title="新增支出分類"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>取消</Button>
            <Button onClick={handleAddCategory} loading={addingCat}>新增</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="主分類" required placeholder="例如：交通、餐飲" value={newCat.Main_Category}
            onChange={e => setNewCat(c => ({ ...c, Main_Category: e.target.value }))} />
          <Input label="子分類" required placeholder="例如：機票、午餐" value={newCat.Sub_Category}
            onChange={e => setNewCat(c => ({ ...c, Sub_Category: e.target.value }))} />
        </div>
      </Modal>

      {/* 停用分類確認 */}
      <ConfirmDialog open={!!deleteCategory} onClose={() => setDeleteCategory(null)} onConfirm={handleDeactivateCategory}
        title="停用分類" message={`確定要停用分類「${deleteCategory?.Main_Category} / ${deleteCategory?.Sub_Category}」嗎？`}
        confirmText="確認停用" loading={deletingCat} />
    </div>
  );
}
