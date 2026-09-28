import rss from '@astrojs/rss';
import { useTranslations } from '@/i18n';
import { getAllPosts } from '@/lib/emdash';

export const prerender = false;

const t = useTranslations();

export async function GET(context) {
    const { posts } = await getAllPosts();
    return rss({
        title: t('siteMetadata.title'),
        description: t('siteMetadata.description'),
        site: context.site,
        items: posts.map(({id, data: {title, summary, tags, date}}) => ({
            title,
            categories: tags.map(({slug}) => slug),
            pubDate: date,
            description: summary,
            link: `/blog/${id}/`,
        })),
    });
}
