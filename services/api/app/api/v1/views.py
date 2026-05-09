from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.central import User, SavedView
from app.schemas.views import SavedViewCreate, SavedViewUpdate, SavedViewResponse

router = APIRouter()


@router.post("", response_model=SavedViewResponse, status_code=status.HTTP_201_CREATED)
async def create_view(
    view_in: SavedViewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view = SavedView(
        user_id=current_user.id,
        name=view_in.name,
        description=view_in.description,
        panel=view_in.panel,
        filters=view_in.filters,
        is_default=view_in.is_default,
    )
    db.add(view)
    await db.commit()
    await db.refresh(view)
    return view


@router.get("", response_model=list[SavedViewResponse])
async def list_views(
    panel: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(SavedView).where(SavedView.user_id == current_user.id).order_by(SavedView.created_at.desc())
    if panel:
        query = query.where(SavedView.panel == panel)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{view_id}", response_model=SavedViewResponse)
async def get_view(
    view_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedView).where(SavedView.id == view_id, SavedView.user_id == current_user.id)
    )
    view = result.scalar_one_or_none()
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    return view


@router.put("/{view_id}", response_model=SavedViewResponse)
async def update_view(
    view_id: int,
    view_in: SavedViewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedView).where(SavedView.id == view_id, SavedView.user_id == current_user.id)
    )
    view = result.scalar_one_or_none()
    if not view:
        raise HTTPException(status_code=404, detail="View not found")

    for field, val in view_in.model_dump(exclude_unset=True).items():
        setattr(view, field, val)
    view.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(view)
    return view


@router.delete("/{view_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_view(
    view_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedView).where(SavedView.id == view_id, SavedView.user_id == current_user.id)
    )
    view = result.scalar_one_or_none()
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    await db.delete(view)
    await db.commit()
