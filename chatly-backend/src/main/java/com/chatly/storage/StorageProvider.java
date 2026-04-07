package com.chatly.storage;

import org.springframework.web.multipart.MultipartFile;

public interface StorageProvider {

    /**
     * Upload a file and return metadata about the stored result.
     *
     * @param file   the multipart file to upload
     * @param folder logical sub-folder (e.g. "chat/images", "chat/files")
     * @return upload result containing the public URL and provider name
     */
    UploadResult upload(MultipartFile file, String folder);

    /**
     * Delete a previously uploaded file by its storage key.
     *
     * @param storageKey provider-specific key returned from {@link UploadResult#storageKey()}
     */
    void delete(String storageKey);
}
