import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Upload, X, Save, LayoutGrid, Image as ImageIcon, Shirt, ArrowLeft, ArrowRight, Database, CheckCircle2, XCircle, Loader2, Edit2, Edit3, BookOpen, ThermometerSun, Thermometer, ThermometerSnowflake, CloudRain, Dices } from 'lucide-react';
import { getItems, getItem, addItem as addItemDB, deleteItem as deleteItemDB, getFits, addFit as addFitDB, deleteFit as deleteFitDB, DBSavedFit } from './db';
import { motion, AnimatePresence } from 'motion/react';
import { Autocomplete } from './components/Autocomplete';

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
  watch: Item[];
};

type SavedFit = {
  id: string;
  name: string;
  styleCategory?: string;
  outfit: Outfit;
  order: number;
  weather?: 'hot' | 'medium' | 'cold';
  rain?: boolean;
};

const LEXICON = [
  "Rockhopper Penguin", "Cardamom", "Snow Leopard", "Fennec Fox", "Red Panda",
  "Monstera", "Eucalyptus", "Axolotl", "Pangolin", "Capybara", "Bonsai",
  "Orchid", "Mantis Shrimp", "Tardigrade", "Cactus", "Bamboo", "Kangaroo",
  "Koala", "Platypus", "Wombat", "Echidna", "Cassowary", "Kookaburra",
  "Quokka", "Tasmanian Devil", "Dingo", "Wallaby", "Numbat", "Quoll",
  "Macadamia", "Baobab", "Sequoia", "Ginkgo", "Lotus", "Water Lily",
  "Sunflower", "Dandelion", "Lavender", "Rosemary", "Thyme", "Sage",
  "Basil", "Mint", "Coriander", "Parsley", "Chives", "Dill", "Fennel",
  "Tarragon", "Oregano", "Marjoram", "Lemongrass", "Chamomile", "Jasmine"
];
const generateRandomName = () => LEXICON[Math.floor(Math.random() * LEXICON.length)];

type SlotKey = keyof Outfit;

type ViewState = 'home' | 'builder' | 'saved' | 'closet';

type SlotProps = {
  label: string;
  slotKey: SlotKey;
  items: Item[];
  onDrop?: (slotKey: SlotKey) => void;
  onRemove?: (slotKey: SlotKey, itemId: string) => void;
  className?: string;
  readOnly?: boolean;
};

const Slot = ({ label, slotKey, items, onDrop, onRemove, className = "aspect-square", readOnly = false }: SlotProps) => {
  const gridClass = items.length === 1 ? 'grid-cols-1' : 
                    items.length === 2 ? 'grid-cols-2' : 
                    items.length === 3 ? 'grid-cols-2 grid-rows-2' : 
                    'grid-cols-2 grid-rows-2';

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-full border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden transition-colors ${readOnly ? '' : 'hover:border-zinc-700 group'} ${className}`}
      onDragOver={(e) => {
        if (!readOnly) e.preventDefault();
      }}
      onDrop={() => {
        if (!readOnly && onDrop) onDrop(slotKey);
      }}
    >
      <span className="absolute top-2 left-2 text-[10px] uppercase tracking-widest text-zinc-500 font-mono z-20 pointer-events-none bg-zinc-900/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
        {label}
      </span>

      {items.length > 0 ? (
        <div className={`w-full h-full grid gap-0.5 ${gridClass}`}>
          {items.map((item, i) => (
            <div key={item.id} className={`relative group/item ${items.length === 3 && i === 0 ? 'col-span-2 row-span-1' : ''}`}>
              <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-90" />
              {!readOnly && onRemove && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(slotKey, item.id); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-zinc-400 hover:text-white transition-colors z-30 opacity-0 group-hover/item:opacity-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-zinc-700 font-mono text-xs pointer-events-none">EMPTY</div>
      )}
    </div>
  );
};

const FitCollage = ({ outfit, onClick }: { outfit: Outfit, onClick?: () => void }) => {
  const headwear = outfit.headwear[0];
  const tops = outfit.top.slice(0, 2);
  const bottom = outfit.bottom[0];
  const footwear = outfit.footwear[0];

  const renderQuadrant = (item?: Item) => {
    if (!item) {
      return (
        <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-800 font-mono text-[10px]">
          EMPTY
        </div>
      );
    }
    return <img src={item.image} alt={item.title} className="w-full h-full object-cover bg-zinc-800" />;
  };

  const renderTopsQuadrant = () => {
    if (tops.length === 0) return renderQuadrant(undefined);
    if (tops.length === 1) return renderQuadrant(tops[0]);
    
    return (
      <div className="w-full h-full grid grid-cols-2 gap-1 bg-zinc-950">
        <img src={tops[0].image} alt={tops[0].title} className="w-full h-full object-cover bg-zinc-800" />
        <img src={tops[1].image} alt={tops[1].title} className="w-full h-full object-cover bg-zinc-800" />
      </div>
    );
  };

  return (
    <div onClick={onClick} className="w-full aspect-square grid grid-cols-2 grid-rows-2 gap-1 rounded-xl overflow-hidden bg-zinc-950 cursor-pointer">
      <div className="w-full h-full overflow-hidden bg-zinc-900">
        {renderQuadrant(headwear)}
      </div>
      <div className="w-full h-full overflow-hidden bg-zinc-900">
        {renderTopsQuadrant()}
      </div>
      <div className="w-full h-full overflow-hidden bg-zinc-900">
        {renderQuadrant(bottom)}
      </div>
      <div className="w-full h-full overflow-hidden bg-zinc-900">
        {renderQuadrant(footwear)}
      </div>
    </div>
  );
};

const FitLayoutPreview = ({ outfit, size = 'md' }: { outfit: Outfit, size?: 'sm' | 'md' | 'lg' }) => {
  const containerClasses = {
    sm: "gap-2 sm:gap-3 md:gap-4",
    md: "gap-2 sm:gap-4 md:gap-6",
    lg: "gap-4 sm:gap-6 md:gap-8"
  };
  
  const sideColClasses = {
    sm: "gap-2 sm:gap-3 md:gap-4 w-14 sm:w-16 md:w-20 pt-8 sm:pt-12 md:pt-16",
    md: "gap-2 sm:gap-4 md:gap-6 w-16 sm:w-20 md:w-24 pt-10 sm:pt-16 md:pt-20",
    lg: "gap-4 sm:gap-6 md:gap-8 w-24 sm:w-32 md:w-40 pt-16 sm:pt-24 md:pt-32"
  };
  
  const centerColClasses = {
    sm: "gap-2 sm:gap-3 md:gap-4 w-20 sm:w-24 md:w-28",
    md: "gap-2 sm:gap-4 md:gap-6 w-24 sm:w-28 md:w-32",
    lg: "gap-4 sm:gap-6 md:gap-8 w-32 sm:w-48 md:w-56"
  };

  return (
    <div className={`flex flex-row justify-center w-full max-w-3xl mx-auto ${containerClasses[size]}`}>
      {/* Left Column */}
      <div className={`flex flex-col ${sideColClasses[size]}`}>
        <Slot label="Accessories" slotKey="accessories" items={outfit.accessories} readOnly />
        <Slot label="L. Arm" slotKey="leftArm" items={outfit.leftArm} readOnly />
        <Slot label="Watch" slotKey="watch" items={outfit.watch} readOnly />
      </div>
      
      {/* Center Column */}
      <div className={`flex flex-col ${centerColClasses[size]}`}>
        <Slot label="Headwear" slotKey="headwear" items={outfit.headwear} readOnly />
        <Slot label="Top / Outerwear" slotKey="top" items={outfit.top} className="aspect-[3/4]" readOnly />
        <Slot label="Bottom" slotKey="bottom" items={outfit.bottom} readOnly />
        <Slot label="Footwear" slotKey="footwear" items={outfit.footwear} readOnly />
      </div>
      
      {/* Right Column */}
      <div className={`flex flex-col ${sideColClasses[size]}`}>
        <Slot label="Eyewear" slotKey="eyewear" items={outfit.eyewear} readOnly />
        <Slot label="R. Arm" slotKey="rightArm" items={outfit.rightArm} readOnly />
      </div>
    </div>
  );
};

const getCarouselOffset = (index: number, currentIndex: number, length: number) => {
  let diff = index - currentIndex;
  if (diff > length / 2) diff -= length;
  if (diff < -length / 2) diff += length;
  return diff;
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
    watch: [],
  });
  
  const [savedFits, setSavedFits] = useState<SavedFit[]>([]);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDraft, setUploadDraft] = useState<{ id?: string; file?: File; preview: string; title: string; description: string; category: string } | null>(null);
  
  // Save Fit State
  const [isSavingFit, setIsSavingFit] = useState(false);
  const [fitName, setFitName] = useState('');
  const [fitStyleCategory, setFitStyleCategory] = useState('');
  const [fitWeather, setFitWeather] = useState<'hot' | 'medium' | 'cold'>('medium');
  const [fitRain, setFitRain] = useState(false);
  const [editingFitId, setEditingFitId] = useState<string | null>(null);
  
  // Rename Fit State
  const [editingFitMetadata, setEditingFitMetadata] = useState<SavedFit | null>(null);
  const [editingFitName, setEditingFitName] = useState('');
  const [editingFitStyleCategory, setEditingFitStyleCategory] = useState('');
  const [editingFitWeather, setEditingFitWeather] = useState<'hot' | 'medium' | 'cold'>('medium');
  const [editingFitRain, setEditingFitRain] = useState(false);

  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [draggedFitId, setDraggedFitId] = useState<string | null>(null);
  const [fitFilterItemId, setFitFilterItemId] = useState<string>('All');
  const [fitFilterStyle, setFitFilterStyle] = useState<string>('All');
  const [fitSortWeather, setFitSortWeather] = useState<'all' | 'hot' | 'medium' | 'cold'>('all');
  const [fitSortRain, setFitSortRain] = useState<'all' | 'rain' | 'no-rain'>('all');
  const [fitSortOrder, setFitSortOrder] = useState<'custom' | 'name-asc' | 'name-desc'>('custom');
  const [lookbookMode, setLookbookMode] = useState(false);
  const [lookbookIndex, setLookbookIndex] = useState(0);
  const [lookbookDirection, setLookbookDirection] = useState(0);
  const [previewFit, setPreviewFit] = useState<SavedFit | null>(null);

  const displayedFits = savedFits
    .filter(fit => fitFilterItemId === 'All' || Object.values(fit.outfit).some(slot => (slot as Item[]).some(item => item.id === fitFilterItemId)))
    .filter(fit => fitSortWeather === 'all' || fit.weather === fitSortWeather)
    .filter(fit => fitSortRain === 'all' || (fitSortRain === 'rain' ? fit.rain : !fit.rain))
    .filter(fit => fitFilterStyle === 'All' || fit.styleCategory === fitFilterStyle)
    .sort((a, b) => {
      if (fitSortOrder === 'name-asc') {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (fitSortOrder === 'name-desc') {
        return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
      }
      return (a.order ?? 0) - (b.order ?? 0);
    });

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
            weather: dbFit.weather,
            rain: dbFit.rain,
            outfit: {
              headwear: mapSlot(dbFit.outfit.headwear),
              eyewear: mapSlot(dbFit.outfit.eyewear),
              top: mapSlot(dbFit.outfit.top),
              bottom: mapSlot(dbFit.outfit.bottom),
              footwear: mapSlot(dbFit.outfit.footwear),
              leftArm: mapSlot(dbFit.outfit.leftArm),
              rightArm: mapSlot(dbFit.outfit.rightArm),
              accessories: mapSlot(dbFit.outfit.accessories),
              watch: mapSlot(dbFit.outfit.watch || []),
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

  useEffect(() => {
    if (!lookbookMode || displayedFits.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setLookbookDirection(1);
        setLookbookIndex(prev => (prev + 1) % displayedFits.length);
      } else if (e.key === 'ArrowLeft') {
        setLookbookDirection(-1);
        setLookbookIndex(prev => (prev - 1 + displayedFits.length) % displayedFits.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lookbookMode, displayedFits.length]);

  useEffect(() => {
    if (!previewFit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewFit(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFit]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setUploadDraft(prev => prev ? {
        ...prev,
        file,
        preview,
      } : {
        file,
        preview,
        title: file.name.split('.')[0],
        description: '',
        category: 'Top', // Default category
      });
    }
  };

  const handleEditItem = (item: Item) => {
    setUploadDraft({
      id: item.id,
      preview: item.image,
      title: item.title,
      description: item.description || '',
      category: item.category,
    });
    setIsUploading(true);
  };

  const handleSaveItem = async () => {
    if (uploadDraft) {
      const isEditing = !!uploadDraft.id;
      const id = uploadDraft.id || Math.random().toString(36).substring(7);
      
      let imageBlob: Blob;
      if (uploadDraft.file) {
        imageBlob = uploadDraft.file;
      } else if (isEditing) {
        const existingItem = await getItem(id);
        if (!existingItem) {
          console.error("Original item not found in DB");
          return;
        }
        imageBlob = existingItem.imageBlob;
      } else {
        return;
      }

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
          imageBlob,
        });

        if (isEditing) {
          setCloset(prev => prev.map(i => i.id === id ? newItem : i));
          
          setOutfit(prev => {
            const newOutfit = { ...prev };
            for (const key of Object.keys(newOutfit) as SlotKey[]) {
              newOutfit[key] = newOutfit[key].map(i => i.id === id ? newItem : i);
            }
            return newOutfit;
          });
          
          setSavedFits(prev => prev.map(fit => {
            const newFitOutfit = { ...fit.outfit };
            for (const key of Object.keys(newFitOutfit) as SlotKey[]) {
              newFitOutfit[key] = newFitOutfit[key].map(i => i.id === id ? newItem : i);
            }
            return { ...fit, outfit: newFitOutfit };
          }));
        } else {
          setCloset((prev) => [...prev, newItem]);
        }
        
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

  const handleSaveFit = async (updateExisting: boolean = false) => {
    const finalName = fitName.trim() || generateRandomName();
    const finalStyleCategory = fitStyleCategory.trim() || 'Uncategorized';
    const id = (updateExisting && editingFitId) ? editingFitId : Math.random().toString(36).substring(7);
    const newOrder = (updateExisting && editingFitId) 
      ? savedFits.find(f => f.id === id)?.order ?? savedFits.length 
      : savedFits.length;
      
    const newFit: SavedFit = {
      id,
      name: finalName,
      styleCategory: finalStyleCategory,
      order: newOrder,
      weather: fitWeather,
      rain: fitRain,
      outfit: { ...outfit },
    };

    const dbFit: DBSavedFit = {
      id,
      name: newFit.name,
      styleCategory: newFit.styleCategory,
      order: newOrder,
      weather: fitWeather,
      rain: fitRain,
      outfit: {
        headwear: outfit.headwear.map(i => i.id),
        eyewear: outfit.eyewear.map(i => i.id),
        top: outfit.top.map(i => i.id),
        bottom: outfit.bottom.map(i => i.id),
        footwear: outfit.footwear.map(i => i.id),
        leftArm: outfit.leftArm.map(i => i.id),
        rightArm: outfit.rightArm.map(i => i.id),
        accessories: outfit.accessories.map(i => i.id),
        watch: outfit.watch.map(i => i.id),
      }
    };

    try {
      await addFitDB(dbFit);
      if (updateExisting && editingFitId) {
        setSavedFits((prev) => prev.map(f => f.id === id ? newFit : f));
      } else {
        setSavedFits((prev) => [...prev, newFit]);
      }
      setFitName('');
      setFitWeather('medium');
      setFitRain(false);
      setEditingFitId(null);
      setIsSavingFit(false);
      setLookbookMode(false);
      setCurrentView('saved');
    } catch (err) {
      console.error("Failed to save fit", err);
    }
  };

  const handleFitDragStart = (id: string) => {
    setDraggedFitId(id);
  };

  const handleFitDragOver = (targetId: string) => {
    if (!draggedFitId || draggedFitId === targetId) return;
    
    setSavedFits(prev => {
      const newFits = [...prev];
      const draggedIdx = newFits.findIndex(f => f.id === draggedFitId);
      const targetIdx = newFits.findIndex(f => f.id === targetId);
      
      const [draggedFit] = newFits.splice(draggedIdx, 1);
      newFits.splice(targetIdx, 0, draggedFit);
      
      return newFits.map((fit, index) => ({ ...fit, order: index }));
    });
  };

  const handleFitDragEnd = async () => {
    if (!draggedFitId) return;
    setDraggedFitId(null);
    
    try {
      for (const fit of savedFits) {
        await addFitDB({
          id: fit.id,
          name: fit.name,
          order: fit.order,
          weather: fit.weather,
          rain: fit.rain,
          outfit: {
            headwear: fit.outfit.headwear.map(i => i.id),
            eyewear: fit.outfit.eyewear.map(i => i.id),
            top: fit.outfit.top.map(i => i.id),
            bottom: fit.outfit.bottom.map(i => i.id),
            footwear: fit.outfit.footwear.map(i => i.id),
            leftArm: fit.outfit.leftArm.map(i => i.id),
            rightArm: fit.outfit.rightArm.map(i => i.id),
            accessories: fit.outfit.accessories.map(i => i.id),
            watch: fit.outfit.watch.map(i => i.id),
          }
        });
      }
    } catch (err) {
      console.error("Failed to save reordered fits", err);
    }
  };

  const handleLoadFit = (fit: SavedFit) => {
    setOutfit(fit.outfit);
    setEditingFitId(fit.id);
    setFitName(fit.name === 'Untitled Fit' ? '' : fit.name);
    setFitWeather(fit.weather || 'medium');
    setFitRain(fit.rain || false);
    setCurrentView('builder');
  };

  const handleStartEditMetadata = (fit: SavedFit) => {
    setEditingFitMetadata(fit);
    setEditingFitName(fit.name === 'Untitled Fit' ? '' : fit.name);
    setEditingFitStyleCategory(fit.styleCategory || '');
    setEditingFitWeather(fit.weather || 'medium');
    setEditingFitRain(fit.rain || false);
  };

  const handleSaveMetadata = async () => {
    if (!editingFitMetadata) return;
    
    const finalName = editingFitName.trim() || generateRandomName();
    const finalStyleCategory = editingFitStyleCategory.trim() || 'Uncategorized';
    
    const updatedFit = { 
      ...editingFitMetadata, 
      name: finalName,
      styleCategory: finalStyleCategory,
      weather: editingFitWeather,
      rain: editingFitRain
    };
    
    try {
      await addFitDB({
        id: updatedFit.id,
        name: updatedFit.name,
        styleCategory: updatedFit.styleCategory,
        order: updatedFit.order,
        weather: updatedFit.weather,
        rain: updatedFit.rain,
        outfit: {
          headwear: updatedFit.outfit.headwear.map(i => i.id),
          eyewear: updatedFit.outfit.eyewear.map(i => i.id),
          top: updatedFit.outfit.top.map(i => i.id),
          bottom: updatedFit.outfit.bottom.map(i => i.id),
          footwear: updatedFit.outfit.footwear.map(i => i.id),
          leftArm: updatedFit.outfit.leftArm.map(i => i.id),
          rightArm: updatedFit.outfit.rightArm.map(i => i.id),
          accessories: updatedFit.outfit.accessories.map(i => i.id),
          watch: updatedFit.outfit.watch.map(i => i.id),
        }
      });
      setSavedFits(prev => prev.map(f => f.id === updatedFit.id ? updatedFit : f));
      setEditingFitMetadata(null);
    } catch (err) {
      console.error("Failed to update fit metadata", err);
    }
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

  const homeAnimation = useMemo(() => {
    const animations = [
      { animate: { rotateX: [0, 360] }, transition: { duration: 5, repeat: Infinity, ease: "linear" } },
      { animate: { filter: ["blur(0px)", "blur(8px)", "blur(0px)"] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
      { animate: { letterSpacing: ["0.1em", "0.5em", "0.1em"] }, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
      { animate: { rotateY: [0, 360] }, transition: { duration: 5, repeat: Infinity, ease: "linear" } },
      { animate: { y: [0, -15, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
      { animate: { rotateZ: [-3, 3, -3] }, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
      { animate: { textShadow: ["0px 0px 10px rgba(255,255,255,0.4)", "0px 0px 40px rgba(255,255,255,1), 0px 0px 20px rgba(255,255,255,0.8), 0px 0px 10px rgba(255,255,255,0.6)", "0px 0px 10px rgba(255,255,255,0.4)"] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
      { animate: { opacity: [1, 0.2, 1] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
      { animate: { color: ["#ffffff", "#a855f7", "#3b82f6", "#ffffff"] }, transition: { duration: 5, repeat: Infinity, ease: "linear" } },
      { animate: { scaleY: [1, 0.5, 1.5, 1] }, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } }
    ];
    return animations[Math.floor(Math.random() * animations.length)];
  }, [currentView]);

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-12">
      <div className="text-center space-y-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <motion.h2 
            initial={{ letterSpacing: "0.1em" }}
            {...homeAnimation}
            className="text-6xl sm:text-7xl md:text-8xl font-light uppercase inline-block"
          >
            WARDROBE
          </motion.h2>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-zinc-500 font-mono text-sm uppercase tracking-widest"
        >
          Curate. Build. Save.
        </motion.p>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
      >
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
          onClick={() => {
            setLookbookMode(false);
            setCurrentView('saved');
          }}
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
      </motion.div>
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

                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="p-2 bg-black/50 hover:bg-blue-500/80 rounded-full text-zinc-400 hover:text-white transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-zinc-400 hover:text-white transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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
              onClick={() => {
                setIsSavingFit(true);
                if (!fitName) setFitName(generateRandomName());
              }}
              disabled={isOutfitEmpty}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-300 hover:text-white transition-colors border border-zinc-800 px-3 py-1.5 rounded-full hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={12} />
              {editingFitId ? 'Update Fit' : 'Save Fit'}
            </button>
          </div>
        </div>
        
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center gap-4 sm:gap-6 max-w-2xl mx-auto">
            {/* Left Column */}
            <div className="flex flex-col gap-4 sm:gap-6 w-24 sm:w-32 pt-16 sm:pt-24">
              <Slot label="Accessories" slotKey="accessories" items={outfit.accessories} onDrop={handleDrop} onRemove={handleRemoveFromSlot} />
              <Slot label="L. Arm" slotKey="leftArm" items={outfit.leftArm} onDrop={handleDrop} onRemove={handleRemoveFromSlot} />
              <Slot label="Watch" slotKey="watch" items={outfit.watch} onDrop={handleDrop} onRemove={handleRemoveFromSlot} />
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

    return (
      <section className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-mono">Saved Fits</h2>
            <span className="text-xs text-zinc-600 font-mono">{savedFits.length} SAVED</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
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
            
            {savedFits.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Style:</span>
                <select 
                  value={fitFilterStyle} 
                  onChange={(e) => setFitFilterStyle(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-600 text-zinc-100"
                >
                  <option value="All">All Styles</option>
                  {Array.from(new Set(savedFits.map(f => f.styleCategory).filter(Boolean))).map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>
            )}
            
            {savedFits.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Weather:</span>
                <select 
                  value={fitSortWeather} 
                  onChange={(e) => setFitSortWeather(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-600 text-zinc-100"
                >
                  <option value="all">All</option>
                  <option value="hot">Hot</option>
                  <option value="medium">Medium</option>
                  <option value="cold">Cold</option>
                </select>
              </div>
            )}
            
            {savedFits.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Rain:</span>
                <select 
                  value={fitSortRain} 
                  onChange={(e) => setFitSortRain(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-600 text-zinc-100"
                >
                  <option value="all">All</option>
                  <option value="rain">Rain</option>
                  <option value="no-rain">No Rain</option>
                </select>
              </div>
            )}
            
            {savedFits.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Sort:</span>
                <select 
                  value={fitSortOrder} 
                  onChange={(e) => setFitSortOrder(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-600 text-zinc-100"
                >
                  <option value="custom">Custom Order</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>
            )}
            
            <button 
              onClick={() => setLookbookMode(!lookbookMode)}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors px-3 py-1.5 border border-zinc-800 rounded-lg hover:bg-zinc-800"
            >
              {lookbookMode ? <LayoutGrid size={14} /> : <BookOpen size={14} />}
              {lookbookMode ? 'Grid View' : 'Lookbook'}
            </button>
          </div>
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
        ) : lookbookMode ? (
          <div className="flex flex-col items-center justify-center py-4 sm:py-8 relative overflow-hidden min-h-[650px] sm:min-h-[750px] md:min-h-[800px] w-full">
            <div className="relative w-full max-w-6xl h-[550px] sm:h-[650px] md:h-[700px] flex items-center justify-center">
              {displayedFits.map((fit, index) => {
                const offset = getCarouselOffset(index, lookbookIndex, displayedFits.length);
                const isCurrent = offset === 0;
                const isVisible = Math.abs(offset) <= 1 || displayedFits.length <= 3;
                
                return (
                  <motion.div
                    key={fit.id}
                    initial={false}
                    animate={{
                      x: `${offset * 85}%`,
                      scale: isCurrent ? 1 : 0.7,
                      opacity: isCurrent ? 1 : Math.abs(offset) === 1 ? 0.3 : 0,
                      zIndex: isCurrent ? 20 : 10,
                    }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    onClick={() => {
                      if (!isCurrent && Math.abs(offset) === 1) {
                        setLookbookDirection(offset > 0 ? 1 : -1);
                        setLookbookIndex(index);
                      }
                    }}
                    className={`absolute w-full max-w-3xl flex flex-col gap-4 sm:gap-8 items-center ${isCurrent ? 'pointer-events-auto' : 'pointer-events-auto cursor-pointer'}`}
                    style={{ pointerEvents: Math.abs(offset) > 1 ? 'none' : 'auto' }}
                  >
                    <div className="flex items-center justify-between w-full max-w-3xl px-4 sm:px-8">
                      <div className="flex flex-col gap-1 sm:gap-2">
                        <div className="flex flex-col">
                          {fit.styleCategory && (
                            <span className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest mb-1">{fit.styleCategory}</span>
                          )}
                          <h3 className="text-xl sm:text-2xl font-light tracking-widest uppercase">{fit.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                          {fit.weather === 'hot' && <ThermometerSun size={16} className="text-red-400/70" />}
                          {fit.weather === 'medium' && <Thermometer size={16} className="text-zinc-400/70" />}
                          {fit.weather === 'cold' && <ThermometerSnowflake size={16} className="text-blue-400/70" />}
                          {fit.rain && <CloudRain size={16} className="text-blue-400/70" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <span className="text-[10px] sm:text-xs text-zinc-500 font-mono">
                          {index + 1} / {displayedFits.length}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadFit(fit);
                          }} 
                          className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors px-3 sm:px-4 py-1.5 sm:py-2 border border-zinc-800 rounded-full hover:bg-zinc-800"
                          tabIndex={isCurrent ? 0 : -1}
                        >
                          Load
                        </button>
                      </div>
                    </div>
                    <div className={`w-full ${isCurrent ? '' : 'pointer-events-none'}`}>
                      <FitLayoutPreview outfit={fit.outfit} size="sm" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Navigation Buttons */}
            {displayedFits.length > 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-0 sm:px-4 pointer-events-none z-30">
                <button 
                  onClick={() => {
                    setLookbookDirection(-1);
                    setLookbookIndex(prev => (prev - 1 + displayedFits.length) % displayedFits.length);
                  }}
                  className="pointer-events-auto p-4 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors backdrop-blur-md border border-zinc-800"
                >
                  <ArrowLeft size={24} />
                </button>
                <button 
                  onClick={() => {
                    setLookbookDirection(1);
                    setLookbookIndex(prev => (prev + 1) % displayedFits.length);
                  }}
                  className="pointer-events-auto p-4 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors backdrop-blur-md border border-zinc-800"
                >
                  <ArrowRight size={24} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedFits.map(fit => (
              <motion.div 
                layout
                key={fit.id} 
                draggable={fitFilterItemId === 'All'}
                onDragStart={() => fitFilterItemId === 'All' && handleFitDragStart(fit.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (fitFilterItemId === 'All') handleFitDragOver(fit.id);
                }}
                onDragEnd={handleFitDragEnd}
                className={`flex flex-col gap-4 p-4 border border-zinc-900 rounded-2xl bg-zinc-950/50 hover:border-zinc-700 transition-colors group ${fitFilterItemId === 'All' ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedFitId === fit.id ? 'opacity-50 border-zinc-500' : ''}`}
              >
                <FitCollage outfit={fit.outfit} onClick={() => setPreviewFit(fit)} />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col overflow-hidden pr-2">
                      {fit.styleCategory && (
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none mb-1">{fit.styleCategory}</span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium tracking-wide truncate">{fit.name}</span>
                        <button 
                          onClick={() => handleStartEditMetadata(fit)}
                          className="text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    </div>
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
                  <div className="flex items-center gap-2 text-zinc-500">
                    {fit.weather === 'hot' && <ThermometerSun size={14} className="text-red-400/70" />}
                    {fit.weather === 'medium' && <Thermometer size={14} className="text-zinc-400/70" />}
                    {fit.weather === 'cold' && <ThermometerSnowflake size={14} className="text-blue-400/70" />}
                    {fit.rain && <CloudRain size={14} className="text-blue-400/70" />}
                  </div>
                </div>
              </motion.div>
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

      {/* Preview Fit Modal */}
      {previewFit && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex flex-col items-center p-4 sm:p-8 overflow-y-auto">
          <div className="fixed top-0 left-0 right-0 p-4 sm:p-8 flex items-center justify-start z-[110] pointer-events-none">
            <button
              onClick={() => setPreviewFit(null)}
              className="pointer-events-auto flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800 backdrop-blur-md"
            >
              <ArrowLeft size={16} />
              Back to Fits
            </button>
          </div>
          
          <div className="w-full max-w-4xl relative flex flex-col gap-8 my-auto pt-16 pb-8">
            <div className="flex items-center justify-between w-full max-w-3xl mx-auto">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  {previewFit.styleCategory && (
                    <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{previewFit.styleCategory}</span>
                  )}
                  <h3 className="text-2xl font-light tracking-widest uppercase">{previewFit.name}</h3>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  {previewFit.weather === 'hot' && <ThermometerSun size={16} className="text-red-400/70" />}
                  {previewFit.weather === 'medium' && <Thermometer size={16} className="text-zinc-400/70" />}
                  {previewFit.weather === 'cold' && <ThermometerSnowflake size={16} className="text-blue-400/70" />}
                  {previewFit.rain && <CloudRain size={16} className="text-blue-400/70" />}
                </div>
              </div>
              <button 
                onClick={() => {
                  handleLoadFit(previewFit);
                  setPreviewFit(null);
                }} 
                className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors px-4 py-2 border border-zinc-800 rounded-full hover:bg-zinc-800"
              >
                Load in Builder
              </button>
            </div>
            
            <FitLayoutPreview outfit={previewFit.outfit} size="md" />
          </div>
        </div>
      )}

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
            
            <h3 className="text-lg font-light tracking-widest uppercase mb-6">{uploadDraft?.id ? 'Edit Item' : 'Add to Closet'}</h3>
            
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
                <label className="w-full h-48 rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50 relative group cursor-pointer block">
                  <img src={uploadDraft.preview} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs uppercase tracking-widest text-white font-mono">Change Image</span>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                </label>
                
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
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-zinc-500">Style / Category</label>
                <Autocomplete
                  value={fitStyleCategory}
                  onChange={setFitStyleCategory}
                  options={Array.from(new Set(savedFits.map(f => f.styleCategory).filter(Boolean))) as string[]}
                  placeholder="e.g. Casual, Formal..."
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-zinc-500">Fit Name</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={fitName} 
                    onChange={e => setFitName(e.target.value)} 
                    placeholder="Fit Name" 
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors text-zinc-100 placeholder:text-zinc-600" 
                  />
                  <button
                    onClick={() => setFitName(generateRandomName())}
                    className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white flex items-center justify-center"
                    title="Reroll random name"
                  >
                    <Dices size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Weather</label>
                  <span className="text-xs font-medium text-zinc-300 uppercase tracking-widest">{fitWeather}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="1"
                  value={fitWeather === 'cold' ? 0 : fitWeather === 'medium' ? 1 : 2}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setFitWeather(val === 0 ? 'cold' : val === 1 ? 'medium' : 'hot');
                  }}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-400"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
                  <span>Cold</span>
                  <span>Medium</span>
                  <span>Hot</span>
                </div>
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${fitRain ? 'bg-blue-500 border-blue-500' : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'}`}>
                  {fitRain && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Suitable for Rain</span>
              </label>

              {editingFitId ? (
                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => handleSaveFit(false)} 
                    className="flex-1 bg-zinc-800 text-zinc-100 font-medium py-3 rounded-lg hover:bg-zinc-700 transition-colors uppercase tracking-widest text-xs"
                  >
                    Save as New
                  </button>
                  <button 
                    onClick={() => handleSaveFit(true)} 
                    className="flex-1 bg-zinc-100 text-zinc-950 font-medium py-3 rounded-lg hover:bg-white transition-colors uppercase tracking-widest text-xs"
                  >
                    Update Fit
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => handleSaveFit(false)} 
                  className="w-full bg-zinc-100 text-zinc-950 font-medium py-3 rounded-lg hover:bg-white transition-colors uppercase tracking-widest text-xs mt-2"
                >
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Fit Metadata Modal */}
      {editingFitMetadata && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm relative shadow-2xl">
            <button
              onClick={() => setEditingFitMetadata(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-100 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-lg font-light tracking-widest uppercase mb-6">Edit Fit Details</h3>
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-zinc-500">Style Category</label>
                <Autocomplete
                  value={editingFitStyleCategory}
                  onChange={setEditingFitStyleCategory}
                  options={Array.from(new Set(savedFits.map(f => f.styleCategory).filter(Boolean))) as string[]}
                  placeholder="e.g. Casual, Formal, Streetwear"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-zinc-500">Fit Name</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={editingFitName} 
                    onChange={e => setEditingFitName(e.target.value)} 
                    placeholder="Fit Name (Optional)" 
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors text-zinc-100 placeholder:text-zinc-600 flex-1" 
                    autoFocus
                  />
                  <button 
                    onClick={() => setEditingFitName(generateRandomName())}
                    className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
                    title="Reroll random name"
                  >
                    <Dices size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-zinc-500">Weather</label>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="1"
                  value={editingFitWeather === 'cold' ? 0 : editingFitWeather === 'medium' ? 1 : 2}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setEditingFitWeather(val === 0 ? 'cold' : val === 1 ? 'medium' : 'hot');
                  }}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-400"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
                  <span>Cold</span>
                  <span>Medium</span>
                  <span>Hot</span>
                </div>
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editingFitRain ? 'bg-blue-500 border-blue-500' : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'}`}>
                  {editingFitRain && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={editingFitRain} 
                  onChange={(e) => setEditingFitRain(e.target.checked)} 
                />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Suitable for Rain</span>
              </label>

              <button 
                onClick={handleSaveMetadata} 
                className="w-full bg-zinc-100 text-zinc-950 font-medium py-3 rounded-lg hover:bg-white transition-colors uppercase tracking-widest text-xs mt-2"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
