import { ParentChildLink } from '../models';

export async function findChildrenByParent(parentId: string) {
  const links = await ParentChildLink.find({ parent_id: parentId })
    .populate('child_id', 'display_name avatar_url archetype role')
    .lean();

  return links.map((link) => {
    const child = link.child_id as any;
    return {
      ...link,
      id: link._id.toString(),
      child: child ? { ...child, id: child._id.toString() } : null,
    };
  });
}

export async function findParentsByChild(childId: string) {
  const links = await ParentChildLink.find({ child_id: childId })
    .populate('parent_id', 'display_name avatar_url role')
    .lean();

  return links.map((link) => {
    const parent = link.parent_id as any;
    return {
      ...link,
      id: link._id.toString(),
      parent: parent ? { ...parent, id: parent._id.toString() } : null,
    };
  });
}

export function create(parentId: string, childId: string) {
  return ParentChildLink.create({
    parent_id: parentId,
    child_id: childId,
  });
}
