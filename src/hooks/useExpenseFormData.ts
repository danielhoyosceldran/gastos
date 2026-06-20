import { useState, useEffect } from 'react';
import { categoriesService } from '../services/supabase/categories.service';
import { tagsService } from '../services/supabase/tags.service';
import { tagGroupsService } from '../services/supabase/tag-groups.service';
import { paymentMethodsService } from '../services/supabase/payment-methods.service';
import { eventsService } from '../services/supabase/events.service';
import { projectsService } from '../services/supabase/projects.service';
import { getRefData, subscribeRefData } from '../lib/refDataCache';
import type { Category } from '../types/category.types';
import type { Tag, TagGroup } from '../types/tag.types';
import type { PaymentMethod } from '../types/payment-method.types';
import type { Event } from '../types/event.types';
import type { Project } from '../types/project.types';

export interface ExpenseFormData {
  categories: Category[];
  tags: Tag[];
  tagGroups: TagGroup[];
  paymentMethods: PaymentMethod[];
  events: Event[];
  projects: Project[];
  loading: boolean;
}

type RefData = Omit<ExpenseFormData, 'loading'>;

const EMPTY: RefData = {
  categories: [], tags: [], tagGroups: [], paymentMethods: [], events: [], projects: [],
};

async function loadAll(): Promise<RefData> {
  const [categories, tags, tagGroups, paymentMethods, events, projects] = await Promise.all([
    categoriesService.getAll(),
    tagsService.getAll(),
    tagGroupsService.getAll(),
    paymentMethodsService.getAll(),
    eventsService.getAll(),
    projectsService.getAll(),
  ]);
  return { categories, tags, tagGroups, paymentMethods, events, projects };
}

export function useExpenseFormData(): ExpenseFormData {
  const [data, setData] = useState<RefData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    function run() {
      setLoading(true);
      getRefData(loadAll)
        .then((d) => { if (active) setData(d); })
        .finally(() => { if (active) setLoading(false); });
    }

    run();
    const unsubscribe = subscribeRefData(run);
    return () => { active = false; unsubscribe(); };
  }, []);

  return { ...data, loading };
}
