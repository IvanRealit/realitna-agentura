import { cache } from "react";
import { db } from "./db";
import { publicStatuses } from "./catalog";
export const visibleProperty = cache(async (slug: string) =>
  db.property.findFirst({
    where: { slug, status: { in: [...publicStatuses] } },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          bio: true,
        },
      },
    },
  }),
);
