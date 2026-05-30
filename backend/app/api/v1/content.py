"""
Content API
===========
Serves auto-generated SEO blog posts (daily deal articles) produced by the
content engine and stored in Redis. The Next.js frontend merges these with its
curated static posts on /blog and /blog/[slug].
"""
from fastapi import APIRouter, HTTPException

from app.services.content_engine import get_generated_post, list_generated_posts

router = APIRouter()


@router.get("/blog")
async def generated_blog_posts():
    """List auto-generated blog posts, newest first. Returns [] when none."""
    return await list_generated_posts()


@router.get("/blog/{slug}")
async def generated_blog_post(slug: str):
    post = await get_generated_post(slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post
