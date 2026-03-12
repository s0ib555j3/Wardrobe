import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, X, Save, LayoutGrid, Image as ImageIcon, Shirt, ArrowLeft, Database, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { getItems, addItem as addItemDB, deleteItem as deleteItemDB, getFits, addFit as addFitDB, deleteFit as deleteFitDB, DBSavedFit } from './db';

const MAIN_CATEGORIES = [
  'Outerwear',
  'Top',
  'Bottom',
  'Footwear'
];

const ACCESSORY_CATEGORIES = [
  'Bags',
  'Headwear',
  'Eyewear',
  'Watches',
  'Rings',
  'Bracelets',
  'Accessories',
  'Other'
];

type Item = {
  id: string;
  title: string;
  description?: string;
  category: string;
  image: string;
};

type Outfit = {
  headwear: Item[];
  eyewear: Item[];
  top: Item[]; // Now acts as Top / Outerwear combined
  bottom: Item[];
  footwear: Item[];
  leftArm: Item[];
  rightArm: Item[];
  accessories: Item[];
};

type SavedFit = {
  id: string;
  name: string;
  outfit: Outfit;
  order: number;
};

type SlotKey = keyof Outfit;

type ViewState = 'home' | 'builder' | 'saved' | 'closet';

type SlotProps = {
  label: string;
  slotKey: SlotKey;
  items: Item[];
  onDrop: (slotKey: SlotKey) => void;
  onRemove: (slotKey: SlotKey, itemId: string) => void;
  className?: string;
};

const Slot = ({ label, slotKey, items, onDrop, onRemove, className = "aspect-square" }: SlotProps) => {
  const gridClass = items.length === 1 ? 'grid-cols-1' : 
                    items.length === 2 ? 'grid-cols-2' : 
                    items.length === 3 ? 'grid-cols-2 grid-rows-2' : 
                    'grid-cols-2 grid-rows-2';

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-full border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden transition-colors hover:border-zinc-700 group ${className}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(slotKey)}
    >
      <span className="absolute top-2 left-2 text-[10px] uppercase tracking-widest text-zinc-500 font-mono z-20 pointer-events-none bg-zinc-900/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
        {label}
      </span>

      {items.length > 0 ? (
        <div className={`w-full h-full grid gap-0.5 ${gridClass}`}>
          {items.map((item, i) => (
            <div key={item.id} className={`relative group/item ${items.length === 3 && i === 0 ? 'col-span-2 row-span-1' : ''}`}>
              <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-90" />
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(slotKey, item.id); }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-zinc-400 hover:text-white transition-colors z-30 opacity-0 group-hover/item:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-zinc-700 font-mono text-xs pointer-events-none">EMPTY</div>
      )}
    </div>
  );
};

const FitCollage = ({ outfit }: { outfit: Outfit }) => {
  const allItems = Object.values(outfit).flatMap(slot => slot.length > 0 ? [slot[0]] : []);
  const displayItems = allItems.slice(0, 4);
  
  if (displayItems.length === 0) {
    return <div className="w-full aspect-square bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-700 font-mono text-xs">EMPTY</div>;
  }

  const gridClass = displayItems.length === 1 ? 'grid-cols-1' : 
                    displayItems.length === 2 ? 'grid-cols-2' : 
                    displayItems.length === 3 ? 'grid-cols-2 grid-rows-2' : 
                    'grid-cols-2 grid-rows-2';

  return (
    <div className={`w-full aspect-square grid gap-1 rounded-xl overflow-hidden bg-zinc-900 ${gridClass}`}>
      {displayItems.map((item, i) => (
        <img 
          key={i} 
          src={item.image} 
          alt={item.title} 
          className={`w-full h-full object-cover ${displayItems.length === 3 && i === 0 ? 'col-span-2 row-span-1' : ''}`} 
        />
      ))}
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  const [closet, setCloset] = useState<Item[]>([]);
  const [outfit, setOutfit] = useState<Outfit>({
    headwear: [],
    eyewear: [],
    top: [],
    bottom: [],
    footwear: [],
    leftArm: [],
    rightArm: [],
    accessories: [],
  });
  
  const [savedFits, setSavedFits] = useState<SavedFit[]>([]);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDraft, setUploadDraft] = useState<{ file: File; preview: string; title: string; description: string; category: string } | null>(null);
  
  // Save Fit State
  const [isSavingFit, setIsSavingFit] = useState(false);
  const [fitName, setFitName] = useState('');

  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [draggedFitId, setDraggedFitId] = useState<string | null>(null);
  const [fitFilterItemId, setFitFilterItemId] = useState<string>('All');

  useEffect(() => {
    async function loadData() {
      try {
        const dbItems = await getItems();
        const loadedItems: Item[] = dbItems.map(dbItem => ({
          id: dbItem.id,
          title: dbItem.title,
          description: dbItem.description,
          category: dbItem.category,
          image: URL.createObjectURL(dbItem.imageBlob),
        }));
        setCloset(loadedItems);

        const dbFits = await getFits();
        const loadedFits: SavedFit[] = dbFits.map(dbFit => {
          const mapSlot = (ids: string[]) => ids.map(id => loadedItems.find(i => i.id === id)).filter(Boolean) as Item[];
          return {
            id: dbFit.id,
            name: dbFit.name,
            order: dbFit.order ?? 0,
            outfit: {
              headwear: mapSlot(dbFit.outfit.headwear),
              eyewear: mapSlot(dbFit.outfit.eyewear),
              top: mapSlot(dbFit.outfit.top),
              bottom: mapSlot(dbFit.outfit.bottom),
              footwear: mapSlot(dbFit.outfit.footwear),
              leftArm: mapSlot(dbFit.outfit.leftArm),
              rightArm: mapSlot(dbFit.outfit.rightArm),
              accessories: mapSlot(dbFit.outfit.accessories),
            }
          };
        }).sort((a, b) => a.order - b.order);
        
        // Normalize orders
        loadedFits.forEach((f, i) => f.order = i);
        setSavedFits(loadedFits);
        setDbStatus('connected');
      } catch (err) {
        console.error("Failed to load data from DB", err);
        setDbStatus('error');
      }
    }
    loadData();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setUploadDraft({
        file,
        preview,
        title: file.name.split('.')[0],
        description: '',
        category: 'Top', // Default category
      });
    }
  };

  const handleSaveItem = async () => {
    if (uploadDraft) {
      const id = Math.random().toString(36).substring(7);
      const newItem: Item = {
        id,
        title: uploadDraft.title || 'Untitled Item',
        description: uploadDraft.description,
        category: uploadDraft.category,
        image: uploadDraft.preview,
      };

      try {
        await addItemDB({
          id,
          title: newItem.title,
          description: newItem.description,
          category: newItem.category,
          imageBlob: uploadDraft.file,
        });

        setCloset((prev) => [...prev, newItem]);
        setUploadDraft(null);
        setIsUploading(false);
      } catch (err) {
        console.error("Failed to save item to DB", err);
      }
    }
  };

  const handleDragStart = (item: Item) => {
    setDraggedItem(item);
  };

  const handleDrop = (slot: SlotKey) => {
    if (draggedItem) {
      setOutfit((prev) => {
        if (prev[slot].find((i) => i.id === draggedItem.id)) return prev;
        return { ...prev, [slot]: [...prev[slot], draggedItem] };
      });
      setDraggedItem(null);
    }
  };

  const handleRemoveFromSlot = (slot: SlotKey, itemId: string) => {
    setOutfit((prev) => ({
      ...prev,
      [slot]: prev[slot].filter((i) => i.id !== itemId),
    }));
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItemDB(id);
      
      setCloset((prev) => prev.filter((item) => item.id !== id));
      
      setOutfit((prev) => {
        const newOutfit = { ...prev };
        (Object.keys(newOutfit) as SlotKey[]).forEach((key) => {
          newOutfit[key] = newOutfit[key].filter((i) => i.id !== id);
        });
        return newOutfit;
      });

      setSavedFits((prev) => prev.map(fit => {
        const newOutfit = { ...fit.outfit };
        (Object.keys(newOutfit) as SlotKey[]).forEach((key) => {
          newOutfit[key] = newOutfit[key].filter((i) => i.id !== id);
        });
        return { ...fit, outfit: newOutfit };
      }));

      const dbFits = await getFits();
      for (const fit of dbFits) {
        let changed = false;
        (Object.keys(fit.outfit) as SlotKey[]).forEach((key) => {
          if (fit.outfit[key].includes(id)) {
            fit.outfit[key] = fit.outfit[key].filter(i => i !== id);
            changed = true;
          }
        });
        if (changed) {
          await addFitDB(fit);
        }
      }
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  };

  const handleSaveFit = async () => {
    if (fitName.trim()) {
      const id = Math.random().toString(36).substring(7);
      const newOrder = savedFits.length;
      const newFit: SavedFit = {
        id,
        name: fitName.trim(),
        order: newOrder,
        outfit: { ...outfit },
      };

      const dbFit: DBSavedFit = {
        id,
        name: newFit.name,
        order: newOrder,
        outfit: {
          headwear: outfit.headwear.map(i => i.id),
          eyewear: outfit.eyewear.map(i => i.id),
          top: outfit.top.map(i => i.id),
          bottom: outfit.bottom.map(i => i.id),
          footwear: outfit.footwear.map(i => i.id),
          leftArm: outfit.leftArm.map(i => i.id),
          rightArm: outfit.rightArm.map(i => i.id),
          accessories: outfit.accessories.map(i => i.id),
        }
      };

      try {
        await addFitDB(dbFit);
        setSavedFits((prev) => [...prev, newFit]);
        setFitName('');
        setIsSavingFit(false);
        setCurrentView('saved');
      } catch (err) {
        console.error("Failed to save fit", err);
      }
    }
  };

  const handleFitDragStart = (id: string) => {
    setDraggedFitId(id);
  };

  const handleFitDrop = async (targetId: string) => {
    if (!draggedFitId || draggedFitId === targetId) return;
    
    const newFits = [...savedFits];
    const draggedIdx = newFits.findIndex(f => f.id === draggedFitId);
    const targetIdx = newFits.findIndex(f => f.id === targetId);
    
    const [draggedFit] = newFits.splice(draggedIdx, 1);
    newFits.splice(targetIdx, 0, draggedFit);
    
    const updatedFits = newFits.map((fit, index) => ({ ...fit, order: index }));
    setSavedFits(updatedFits);
    setDraggedFitId(null);
    
    try {
      for (const fit of updatedFits) {
        await addFitDB({
          id: fit.id,
          name: fit.name,
          order: fit.order,
          outfit: {
            headwear: fit.outfit.headwear.map(i => i.id),
            eyewear: fit.outfit.eyewear.map(i => i.id),
            top: fit.outfit.top.map(i => i.id),
            bottom: fit.outfit.bottom.map(i => i.id),
            footwear: fit.outfit.footwear.map(i => i.id),
            leftArm: fit.outfit.leftArm.map(i => i.id),
            rightArm: fit.outfit.rightArm.map(i => i.id),
            accessories: fit.outfit.accessories.map(i => i.id),
          }
        });
      }
    } catch (err) {
      console.error("Failed to save reordered fits", err);
    }
  };

  const handleLoadFit = (fit: SavedFit) => {
    setOutfit(fit.outfit);
    setCurrentView('builder');
  };

  const handleDeleteFit = async (id: string) => {
    try {
      await deleteFitDB(id);
      setSavedFits((prev) => prev.filter((fit) => fit.id !== id));
    } catch (err) {
      console.error("Failed to delete fit", err);
    }
  };

  const isOutfitEmpty = Object.values(outfit).every((slot) => (slot as Item[]).length === 0);

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-light tracking-widest uppercase">Your Wardrobe</h2>
        <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Curate. Build. Save.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <button 
          onClick={() => setCurrentView('builder')}
          className="flex flex-col items-center justify-center gap-6 p-12 border border-zinc-800 rounded-3xl bg-zinc-900/20 hover:bg-zinc-900/60 hover:border-zinc-600 transition-all group"
        >
          <div className="p-4 bg-zinc-900 rounded-2xl group-hover:scale-110 transition-transform">
            <LayoutGrid size={32} className="text-zinc-400 group-hover:text-white transition-colors" />
          </div>
          <span className="text-sm uppercase tracking-widest font-medium">Outfit Builder</span>
        </button>

        <button 
          onClick={() => setCurrentView('saved')}
          className="flex flex-col items-center justify-center gap-6 p-12 border border-zinc-800 rounded-3xl bg-zinc-900/20 hover:bg-zinc-900/60 hover:border-zinc-600 transition-all group"
        >
          <div className="p-4 bg-zinc-900 rounded-2xl group-hover:scale-110 transition-transform">
            <ImageIcon size={32} className="text-zinc-400 group-hover:text-white transition-colors" />
          </div>
          <span className="text-sm uppercase tracking-widest font-medium">Saved Fits</span>
        </button>

        <button 
          onClick={() => setCurrentView('closet')}
          className="flex flex-col items-center justify-center gap-6 p-12 border border-zinc-800 rounded-3xl bg-zinc-900/20 hover:bg-zinc-900/60 hover:border-zinc-600 transition-all group"
        >
          <div className="p-4 bg-zinc-900 rounded-2xl group-hover:scale-110 transition-transform">
            <Shirt size={32} className="text-zinc-400 group-hover:text-white transition-colors" />
          </div>
          <span className="text-sm uppercase tracking-widest font-medium">My Closet</span>
        </button>
      </div>
    </div>
  );

  const renderClosetGrid = (isDraggable = false) => {
    const filteredCloset = categoryFilter === 'All' 
      ? closet 
      : categoryFilter === 'All Accessories'
        ? closet.filter(i => ACCESSORY_CATEGORIES.includes(i.category))
        : closet.filter(i => i.category === categoryFilter);

    return (
      <section className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-mono">Closet</h2>
          <span className="text-xs text-zinc-600 font-mono">{filteredCloset.length} ITEMS</span>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          <button 
            onClick={() => setCategoryFilter('All')}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-full border transition-colors ${categoryFilter === 'All' ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
          >
            All
          </button>
          {MAIN_CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-full border transition-colors ${categoryFilter === cat ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
            >
              {cat}
            </button>
          ))}
          <div className="relative">
            <select
              value={ACCESSORY_CATEGORIES.includes(categoryFilter) || categoryFilter === 'All Accessories' ? categoryFilter : 'default'}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`appearance-none pl-3 pr-6 py-1.5 text-[10px] uppercase tracking-widest rounded-full border transition-colors cursor-pointer outline-none ${
                ACCESSORY_CATEGORIES.includes(categoryFilter) || categoryFilter === 'All Accessories' 
                  ? 'border-zinc-500 bg-zinc-800 text-white' 
                  : 'border-zinc-800 bg-transparent text-zinc-500 hover:border-zinc-600'
              }`}
            >
              <option value="default" disabled>Accessories</option>
              <option value="All Accessories">All Accessories</option>
              {ACCESSORY_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        {filteredCloset.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-2xl text-zinc-600">
            <p className="font-mono text-sm uppercase tracking-widest mb-4">No items found</p>
            <button
              onClick={() => setIsUploading(true)}
              className="text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition-colors underline underline-offset-4"
            >
              Upload an item
            </button>
          </div>
        ) : (
          <div className={`grid gap-4 ${isDraggable ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'}`}>
            {filteredCloset.map((item) => (
              <div
                key={item.id}
                draggable={isDraggable}
                onDragStart={() => isDraggable && handleDragStart(item)}
                className={`group relative aspect-[3/4] border border-zinc-900 rounded-xl overflow-hidden bg-zinc-900/30 hover:border-zinc-700 transition-colors ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1">{item.category}</p>
                  <p className="text-xs font-medium truncate text-white">{item.title}</p>
                  {item.description && (
                    <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderBuilder = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <section className="lg:col-span-5 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-mono">Outfit Builder</h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-600 font-mono hidden sm:inline-block">DRAG & DROP</span>
            <button 
              onClick={() => setIsSavingFit(true)}
              disabled={isOutfitEmpty}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-300 hover:text-white transition-colors border border-zinc-800 px-3 py-1.5 rounded-full hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={12} />
              Save Fit
            </button>
          </div>
        </div>
        
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center gap-4 sm:gap-6 max-w-2xl mx-auto">
            {/* Left Column */}
            <div className="flex flex-col gap-4 sm:gap-6 w-24 sm:w-32 pt-16 sm:pt-24">
              <Slot label="Accessories" slotKey="accessories" items={outfit.accessories} onDrop={handleDrop} onRemove={handleRemoveFromSlot} />
              <Slot label="L. Arm" slotKey="leftArm" items={outfit.leftArm} onDrop={handleDrop} onRemove={handleRemoveFromSlot} />
            </div>
            
            {/* Center Column */}
            <div className="flex flex-col gap-4 sm:gap-6 w-32 sm:w-48">
              <Slot label="Headwear" slotKey="headwear" items={outfit.headwear} onDrop={handleDrop} onRemove={handleRemoveFromSlot} />
              <Slot label="Top / Outerwear" slotKey="top" items={outfit.top} onDrop={handleDrop} onRemove={handleRemoveFromSlot} className="aspect-[3/4]" />
              <Slot label="Bottom" slotKey="bottom" items={outfit.bottom} onDrop={handleDrop} onRemove={handleRemoveFromSlot} />
              <Slot label="Footwear" slotKey="footwear" items={outfit.footwear} onDrop={handleDrop} onRemove={handleRemoveFromSlot} />
            </div>
            
            {/* Right Column */}
            <div className="flex flex-col gap-4 sm:gap-6 w-24 sm:w-32 pt-16 sm:pt-24">
              <Slot label="Eyewear" slotKey="eyewear" items={outfit.eyewear} onDrop={handleDrop} onRemove={handleRemoveFromSlot} />
              <Slot label="R. Arm" slotKey="rightArm" items={outfit.rightArm} onDrop={handleDrop} onRemove={handleRemoveFromSlot} />
            </div>
          </div>
        </div>
      </section>

      <div className="lg:col-span-7">
        {renderClosetGrid(true)}
      </div>
    </div>
  );

  const renderSavedFits = () => {
    const itemsInFits = Array.from(new Set(savedFits.flatMap(fit => 
      Object.values(fit.outfit).flatMap(slot => (slot as Item[]).map(item => item.id))
    ))).map(id => closet.find(i => i.id === id)).filter(Boolean) as Item[];

    const displayedFits = fitFilterItemId === 'All' 
      ? savedFits 
      : savedFits.filter(fit => 
          Object.values(fit.outfit).some(slot => (slot as Item[]).some(item => item.id === fitFilterItemId))
        );

    return (
      <section className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-mono">Saved Fits</h2>
            <span className="text-xs text-zinc-600 font-mono">{savedFits.length} SAVED</span>
          </div>
          
          {savedFits.length > 0 && itemsInFits.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Filter by Item:</span>
              <select 
                value={fitFilterItemId} 
                onChange={(e) => setFitFilterItemId(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-600 text-zinc-100 max-w-[200px] truncate"
              >
                <option value="All">All Items</option>
                {itemsInFits.map(item => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {savedFits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-2xl text-zinc-600">
            <p className="font-mono text-sm uppercase tracking-widest mb-4">No saved fits yet</p>
            <button
              onClick={() => setCurrentView('builder')}
              className="text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition-colors underline underline-offset-4"
            >
              Create your first fit
            </button>
          </div>
        ) : displayedFits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-2xl text-zinc-600">
            <p className="font-mono text-sm uppercase tracking-widest">No fits found with this item</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedFits.map(fit => (
              <div 
                key={fit.id} 
                draggable={fitFilterItemId === 'All'}
                onDragStart={() => fitFilterItemId === 'All' && handleFitDragStart(fit.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => fitFilterItemId === 'All' && handleFitDrop(fit.id)}
                className={`flex flex-col gap-4 p-4 border border-zinc-900 rounded-2xl bg-zinc-950/50 hover:border-zinc-700 transition-colors group ${fitFilterItemId === 'All' ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedFitId === fit.id ? 'opacity-50 border-zinc-500' : ''}`}
              >
                <FitCollage outfit={fit.outfit} />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium tracking-wide truncate pr-4">{fit.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleLoadFit(fit)} 
                      className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white transition-colors px-3 py-1.5 border border-zinc-800 rounded-full hover:bg-zinc-800"
                    >
                      Load
                    </button>
                    <button 
                      onClick={() => handleDeleteFit(fit.id)} 
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800">
      <header className="border-b border-zinc-900 px-8 py-6 flex justify-between items-center sticky top-0 bg-zinc-950/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          {currentView !== 'home' && (
            <button onClick={() => setCurrentView('home')} className="text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-xl font-light tracking-widest uppercase cursor-pointer" onClick={() => setCurrentView('home')}>Wardrobe</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-full text-[10px] uppercase tracking-widest font-mono">
            <Database size={12} className="text-zinc-400" />
            {dbStatus === 'connecting' && <span className="text-zinc-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Connecting</span>}
            {dbStatus === 'connected' && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10} /> Local DB Active</span>}
            {dbStatus === 'error' && <span className="text-red-400 flex items-center gap-1"><XCircle size={10} /> DB Error</span>}
          </div>
          <button
            onClick={() => setIsUploading(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest border border-zinc-800 rounded-full hover:bg-zinc-900 transition-colors"
          >
            <Plus size={14} />
            Add Item
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        {currentView === 'home' && renderHome()}
        {currentView === 'builder' && renderBuilder()}
        {currentView === 'saved' && renderSavedFits()}
        {currentView === 'closet' && renderClosetGrid(false)}
      </main>

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 w-full max-w-md relative shadow-2xl">
            <button
              onClick={() => {
                setIsUploading(false);
                setUploadDraft(null);
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-100 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-lg font-light tracking-widest uppercase mb-6">Add to Closet</h3>
            
            {!uploadDraft ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-zinc-800 rounded-xl hover:border-zinc-600 hover:bg-zinc-900/50 transition-all cursor-pointer group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 mb-4 transition-colors" />
                  <p className="text-sm text-zinc-500 font-mono uppercase tracking-widest">Click to upload</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="w-full h-48 rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
                  <img src={uploadDraft.preview} alt="Preview" className="w-full h-full object-contain" />
                </div>
                
                <div className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    value={uploadDraft.title} 
                    onChange={e => setUploadDraft({...uploadDraft, title: e.target.value})} 
                    placeholder="Item Title" 
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors text-zinc-100 placeholder:text-zinc-600" 
                  />
                  
                  <select 
                    value={uploadDraft.category}
                    onChange={e => setUploadDraft({...uploadDraft, category: e.target.value})}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors text-zinc-100 appearance-none"
                  >
                    <optgroup label="Main">
                      {MAIN_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Accessories">
                      {ACCESSORY_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                  </select>

                  <textarea 
                    value={uploadDraft.description} 
                    onChange={e => setUploadDraft({...uploadDraft, description: e.target.value})} 
                    placeholder="Optional Information (Brand, Size, Notes...)" 
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm h-24 resize-none focus:outline-none focus:border-zinc-600 transition-colors text-zinc-100 placeholder:text-zinc-600" 
                  />
                  <button 
                    onClick={handleSaveItem} 
                    className="w-full bg-zinc-100 text-zinc-950 font-medium py-3 rounded-lg hover:bg-white transition-colors uppercase tracking-widest text-xs mt-2"
                  >
                    Save Item
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Fit Modal */}
      {isSavingFit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm relative shadow-2xl">
            <button
              onClick={() => setIsSavingFit(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-100 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-lg font-light tracking-widest uppercase mb-6">Save Fit</h3>
            
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                value={fitName} 
                onChange={e => setFitName(e.target.value)} 
                placeholder="Fit Name (e.g., Summer Night Out)" 
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors text-zinc-100 placeholder:text-zinc-600" 
                autoFocus
              />
              <button 
                onClick={handleSaveFit} 
                disabled={!fitName.trim()}
                className="w-full bg-zinc-100 text-zinc-950 font-medium py-3 rounded-lg hover:bg-white transition-colors uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
