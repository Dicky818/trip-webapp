import React, { useState, useEffect } from 'react';
import { Settings, Link2, Users, Tag, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, Member, Category } from '../api/supabaseApi';
import { Button, Card, Input, Modal, ConfirmDialog, Badge, Spinner } from '../components/ui';

export default function SettingsPage() {
  const { gasUrl, setGasUrl, isConfigured, members, fetchMembers, membersLoading, categories, fetchCategories, categoriesLoading, showToast } = useApp();
  const [urlInput, setUrlInput] = useState(gasUrl);
  const [urlSaved, setUrlSaved] = useState(false);

  // Members state
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [deleteMember, setDeleteMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState(false);

  // Categories state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCat, setNewCat] = useState({ Main_Category: '', Sub_Category: '' });
  const [addingCat, setAddingCat] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  useEffect(() => {
    if (isConfigured) {
      fetchMembers();
      fetchCategories();
    }
  }, [isConfigured]);

  const handleSaveUrl = () => {
    setGasUrl(urlInput.trim());
    setUrlSaved(true);
    showToast('後端 URL 已儲存');
    setTimeout(() => setUrlSaved(false), 2000);
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    setAddingMember(true);
    try {
      await api.createMember({ Member_Name: newMemberName.trim() });
      setNewMemberName('');
      showToast('成員已新增');
      await fetchMembers();
    } catch (e: any) {
      showToast(e.message || '新增失敗', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember || !editMemberName.trim()) return;
    try {
      await api.updateMember(editingMember.Member_ID, { Member_Name: editMemberName.trim() });
      showToast('成員已更新');
      setEditingMember(null);
      await fetchMembers();
    } catch (e: any) {
      showToast(e.message || '更新失敗', 'error');
    }
  };

  const handleDeactivateMember = async () => {
    if (!deleteMember) return;
    setDeletingMember(true);
    try {
      await api.deactivateMember(deleteMember.Member_ID);
      showToast('成員已停用');
      setDeleteMember(null);
      await fetchMembers();
    } catch (e: any) {
      showToast(e.message || '停用失敗', 'error');
    } finally {
      setDeletingMember(false);
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

  const activeMembers = members.filter(m => String(m.Is_Active).toUpperCase() === 'TRUE');
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
          <p className="text-sm text-slate-500">設定後端連接、成員和支出分類</p>
        </div>
      </div>

      {/* GAS URL 設定 */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Link2 size={18} className="text-blue-600" />
          <h2 className="font-semibold text-slate-900">後端連接設定</h2>
          {isConfigured && <Badge color="green">已連接</Badge>}
        </div>
        <p className="text-sm text-slate-500 mb-3">
          請輸入 Google Apps Script Web App 的部署 URL（格式：https://script.google.com/macros/s/.../exec）
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="https://script.google.com/macros/s/.../exec"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSaveUrl} variant={urlSaved ? 'secondary' : 'primary'}>
            {urlSaved ? <><Check size={14} /> 已儲存</> : '儲存'}
          </Button>
        </div>
      </Card>

      {/* 成員管理 */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">成員管理</h2>
            <span className="text-xs text-slate-500">({activeMembers.length} 人)</span>
          </div>
        </div>

        {!isConfigured ? (
          <p className="text-sm text-slate-400 text-center py-4">請先設定後端 URL</p>
        ) : membersLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="輸入成員姓名"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                className="flex-1"
              />
              <Button onClick={handleAddMember} loading={addingMember} disabled={!newMemberName.trim()}>
                <Plus size={15} /> 新增
              </Button>
            </div>
            <div className="space-y-2">
              {activeMembers.map(member => (
                <div key={member.Member_ID} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  {editingMember?.Member_ID === member.Member_ID ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editMemberName}
                        onChange={e => setEditMemberName(e.target.value)}
                        className="flex-1 py-1"
                        autoFocus
                      />
                      <button onClick={handleUpdateMember} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                        <Check size={15} />
                      </button>
                      <button onClick={() => setEditingMember(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-slate-700">{member.Member_Name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingMember(member); setEditMemberName(member.Member_Name); }}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteMember(member)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {activeMembers.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-3">尚無成員，請新增</p>
              )}
            </div>
          </>
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

        {!isConfigured ? (
          <p className="text-sm text-slate-400 text-center py-4">請先設定後端 URL</p>
        ) : categoriesLoading ? (
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

      {/* 停用成員確認 */}
      <ConfirmDialog open={!!deleteMember} onClose={() => setDeleteMember(null)} onConfirm={handleDeactivateMember}
        title="停用成員" message={`確定要停用成員「${deleteMember?.Member_Name}」嗎？`}
        confirmText="確認停用" loading={deletingMember} />

      {/* 停用分類確認 */}
      <ConfirmDialog open={!!deleteCategory} onClose={() => setDeleteCategory(null)} onConfirm={handleDeactivateCategory}
        title="停用分類" message={`確定要停用分類「${deleteCategory?.Main_Category} / ${deleteCategory?.Sub_Category}」嗎？`}
        confirmText="確認停用" loading={deletingCat} />
    </div>
  );
}
