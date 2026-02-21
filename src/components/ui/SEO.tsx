import { Helmet } from 'react-helmet-async'

interface SEOProps {
    title?: string
    description?: string
    canonical?: string
    type?: string
    name?: string
}

/**
 * SEO.tsx
 *
 * Managing head metadata dynamically for each route.
 * Includes OpenGraph tags for premium social sharing previews.
 */
export const SEO = ({
    title,
    description = "Get instant, AI-powered loan eligibility predictions and professional financial analysis. simple, secure, and fast.",
    canonical,
    type = "website",
    name = "LoanPredict"
}: SEOProps) => {
    const fullTitle = title ? `${title} | ${name}` : name

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            {canonical && <link rel="canonical" href={canonical} />}

            {/* OpenGraph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:site_name" content={name} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
        </Helmet>
    )
}
