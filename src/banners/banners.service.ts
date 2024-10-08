import { Injectable } from '@nestjs/common';
import { ref, set, push, remove, get, getDatabase } from 'firebase/database';
import { uploadBytes, ref as storageRef, getDownloadURL, getStorage, deleteObject } from 'firebase/storage';

@Injectable()
export class BannersService {
  async createBanner(file: Express.Multer.File) {
    if (!file) throw new Error('No file found')
    const storageReference = storageRef(getStorage(), `banners/${file.originalname}`);
    const uploadResult = await uploadBytes(storageReference, file.buffer);
    const imageUrl = await getDownloadURL(uploadResult.ref);

    const bannersRef = ref(getDatabase(), 'banners');
    const newBannerRef = push(bannersRef);
    await set(newBannerRef, { imageUrl });

    return { success: true, bannerId: newBannerRef.key };
  }

  async deleteBanner(bannerId: string) {
    const db = getDatabase();
    const bannerRef = ref(db, `banners/${bannerId}`);

    // Retrieve the banner details first
    const snapshot = await get(bannerRef);
    if (!snapshot.exists()) {
      throw new Error('Banner not found');
    }

    const bannerData = snapshot.val();
    const imageUrl = bannerData.imageUrl;

    const fileRef = storageRef(getStorage(), imageUrl);
    await deleteObject(fileRef);

    // Remove the banner entry from the database
    await remove(bannerRef);

    return { success: true };
  }

  async getBanners() {
    const bannersRef = ref(getDatabase(), 'banners');
    const snapshot = await get(bannersRef);
    return snapshot.val() || [];
  }

  async updateBanner(bannerId: string, file: Express.Multer.File) {
    const bannerRef = ref(getDatabase(), `banners/${bannerId}`);

    const snapshot = await get(bannerRef);
    if (!snapshot.exists()) {
      throw new Error('Banner not found');
    }

    const bannerData = snapshot.val();
    let imageUrl = bannerData.imageUrl;

    if (file) {
      // Delete the old image from Firebase Storage
      const storage = getStorage();
      const oldImageRef = storageRef(storage, imageUrl);
      await deleteObject(oldImageRef);

      // Upload the new image
      const newImageRef = storageRef(storage, `banners/${file.originalname}`);
      const uploadResult = await uploadBytes(newImageRef, file.buffer);
      imageUrl = await getDownloadURL(uploadResult.ref);
    }

    // Update the banner data
    await set(bannerRef, { ...bannerData, imageUrl });

    return { success: true };
  }
}
