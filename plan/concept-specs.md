# Concept Specs: Expense Tracking System

## Core Problem

Traditional expense apps force a single category per expense, losing contextual information.  
A dinner with friends is simultaneously **food**, **leisure**, and **social** — forcing one category loses the rest.

---

## Solution: Multi-dimensional Classification

Every expense is described across **four independent dimensions**:

| Dimension | Answers | Example |
|---|---|---|
| **Category** | What was bought | Alimentación > Restaurante |
| **Tags** | Why it happened | Ocio, Amigos |
| **Event** | Which specific occasion | Cena cumpleaños Ana |
| **Project** | Which ongoing goal | Reforma del baño |

---

## 1. Categories

Hierarchical classification of **what** the expense is.

- Up to **3 levels**, all optional — the user decides depth per category
- Levels are independent: one category can have 1 level, another 3

```
Alimentación
Alimentación > Restaurante
Alimentación > Restaurante > Menú del día
```

---

## 2. Tags

Flat labels describing **why** or **in what context** the expense occurred.  
Multiple tags per expense are allowed.

Stored internally in a relational join table (`expense_tags`). Displayed in the UI grouped by type for easier selection:

| 📍 Social context | 🎯 Motivation | 🕐 Life moment |
|---|---|---|
| Solo | Ocio | Vacaciones |
| Pareja | Necesidad | Fin de semana |
| Familia | Capricho | Rutina |
| Amigos | Regalo | Imprevisto |
| Trabajo | Inversión | |

> **Groups are UI only** — not stored in the data model.  
> Users can add custom tags beyond the defaults.

---

## 3. Events

A **specific, time-bounded occasion** that groups expenses together.

- Useful for: trips, celebrations, one-off situations
- Answers: *"How much did this specific trip/event cost in total?"*

```
Event: "Viaje Roma Mayo 2025"
  - Vuelo    → Transporte     + Vacaciones
  - Hotel    → Alojamiento    + Vacaciones
  - Cena     → Alimentación   + Vacaciones + Ocio
```

---

## 4. Projects

An **extended goal with a budget** that groups expenses over time.

- Useful for: home renovations, saving goals, long-term initiatives
- Answers: *"How much have I spent on this project so far?"*

```
Project: "Reforma del baño"
  - Azulejos     → Material > Revestimiento   + Necesidad
  - Fontanero    → Servicios > Fontanería      + Necesidad + Imprevisto
```

---

## Events vs Projects

| | Event | Project |
|---|---|---|
| **Nature** | Specific experience | Goal with budget |
| **Duration** | Punctual | Extended over time |
| **Example** | Viaje Roma Mayo 2025 | Reforma del baño |

> An expense can belong to **both** an event and a project simultaneously.

---

## Complete Example

**Expense:** Dinner at a restaurant during a trip to Rome

```
Amount:     €48
Category:   Alimentación > Restaurante
Tags:       Ocio, Amigos, Vacaciones
Event:      Viaje Roma Mayo 2025
Project:    —
```

This single record answers all of:
- How much did I spend on food this month?
- How much did I spend on leisure?
- How much did the Rome trip cost in total?
- How much do I spend when I'm with friends?

---

## Key Design Principle

> **Categories** answer *"what am I buying"*  
> **Tags** answer *"why am I buying it"*  
> **Events** answer *"which occasion was it"*  
> **Projects** answer *"which goal does it serve"*  

They do not compete — they complement each other.
