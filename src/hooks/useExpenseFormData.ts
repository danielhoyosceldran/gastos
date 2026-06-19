import { useState, useEffect } from 'react';
import { categoriesService } from '../services/supabase/categories.service';
import { tagsService } from '../services/supabase/tags.service';
import { tagGroupsService } from '../services/supabase/tag-groups.service';
import { paymentMethodsService } from '../services/supabase/payment-methods.service';
import { eventsService } from '../services/supabase/events.service';
import { projectsService } from '../services/supabase/projects.service';
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

export function useExpenseFormData(): ExpenseFormData {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      categoriesService.getAll(),
      tagsService.getAll(),
      tagGroupsService.getAll(),
      paymentMethodsService.getAll(),
      eventsService.getAll(),
      projectsService.getAll(),
    ]).then(([c, t, tg, pm, ev, pr]) => {
      setCategories(c);
      setTags(t);
      setTagGroups(tg);
      setPaymentMethods(pm);
      setEvents(ev);
      setProjects(pr);
    }).finally(() => setLoading(false));
  }, []);

  return { categories, tags, tagGroups, paymentMethods, events, projects, loading };
}
