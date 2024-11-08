import type { CollectionEntry } from "astro:content";

type BlogPost = CollectionEntry<'blog'>;
type SortDirection = 'asc' | 'desc';

/**
 * Filter blog posts by published date and order them.
 *
 * @param posts Collection of blog posts
 * @param direction Sort direction ('asc' or 'desc')
 * @param sortBy Optional key to sort by (defaults to 'date')
 * @returns Collection of blog posts sorted by the specified criteria
 */
export const sortBlogPosts = (
    posts: BlogPost[] | null,
    direction: SortDirection = 'desc',
    sortBy: keyof BlogPost['data'] = 'date'
): BlogPost[] => {
    if (!posts?.length) return [];

    return [...posts].sort((a, b) => {
        const valueA = a.data[sortBy];
        const valueB = b.data[sortBy];
        
        if (valueA instanceof Date && valueB instanceof Date) {
            return direction === 'desc' 
                ? valueB.getTime() - valueA.getTime()
                : valueA.getTime() - valueB.getTime();
        }
        
        // Fall back to string comparison for non-date values
        const comparison = String(valueB).localeCompare(String(valueA));
        return direction === 'desc' ? comparison : -comparison;
    });
};

/**
 * Exclude draft posts from the collection.
 * In production, draft posts are always excluded.
 * In development, draft posts can be included based on the includeDrafts parameter.
 *
 * @param post Blog post to check
 * @param includeDrafts Whether to include drafts in development (defaults to true)
 * @returns True if the post should be included
 */
export const excludeDrafts = (
    { data }: BlogPost,
    includeDrafts: boolean = true
): boolean => {
    if (import.meta.env.PROD) {
        return !data.draft;
    }
    return includeDrafts || !data.draft;
};

// Example usage:
const posts: BlogPost[] = []; // Replace with your actual posts data
const newestFirst = sortBlogPosts(posts);

// Sort posts by date (ascending)
const oldestFirst = sortBlogPosts(posts, 'asc');

// Sort posts by title
const byTitle = sortBlogPosts(posts, 'desc', 'title');

// Filter drafts in development
const publishedPosts = posts.filter(post => excludeDrafts(post, false));