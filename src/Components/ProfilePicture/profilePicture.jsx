import React, { useState } from "react";

const ProfilePicture = ({ onFileChange }) => {
  const [previewURL, setPreviewURL] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewURL(URL.createObjectURL(file)); // Generate preview URL
      onFileChange(file); // Pass the file up to the parent component
    }
  };

  return (
    <div className="account_nickName_container">
      <label className="custom-file-upload">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {previewURL && (
          <img
            src={previewURL}
            alt="Preview"
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "1rem",
            }}
          />
        )}
        Change Profile Picture
      </label>
    </div>
  );
};

export default ProfilePicture;
