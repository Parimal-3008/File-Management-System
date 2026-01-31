#!/usr/bin/env python3
"""
Generate a complex filesystem structure in NDJSON format.
Creates 110k items with 40+ metadata fields per item.
Mandatory fields: id, parent_id
Path can be reconstructed by traversing parent_id relationships.
"""

import json
import random
import string
from datetime import datetime, timedelta
from pathlib import Path
import hashlib
import uuid

# Configuration
TOTAL_ITEMS = 110000
MIN_ITEMS_PER_FOLDER = 1000
OUTPUT_FILE = "big.ndjson"

# File extensions by category
FILE_EXTENSIONS = {
    'documents': ['.txt', '.pdf', '.doc', '.docx', '.odt', '.rtf'],
    'images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
    'videos': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'],
    'audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
    'code': ['.py', '.js', '.java', '.cpp', '.c', '.go', '.rs', '.rb'],
    'data': ['.json', '.xml', '.csv', '.yaml', '.sql', '.db'],
    'archive': ['.zip', '.tar', '.gz', '.rar', '.7z'],
}

# Sample data for metadata
USERS = [f"user{i}" for i in range(1, 51)]
DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Research']
PROJECTS = [f"Project_{chr(65+i)}" for i in range(26)]
TAGS = ['important', 'archived', 'draft', 'reviewed', 'confidential', 'public', 'internal', 
        'deprecated', 'active', 'pending', 'approved', 'rejected']
MIME_TYPES = {
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.py': 'text/x-python',
    '.js': 'text/javascript',
}

def generate_random_string(length=10):
    """Generate a random string."""
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def generate_md5(text):
    """Generate MD5 hash."""
    return hashlib.md5(text.encode()).hexdigest()

def generate_sha256(text):
    """Generate SHA256 hash."""
    return hashlib.sha256(text.encode()).hexdigest()

def random_date(start_date, end_date):
    """Generate a random datetime between two dates."""
    time_delta = end_date - start_date
    total_seconds = int(time_delta.total_seconds())
    
    if total_seconds <= 0:
        return start_date
    
    random_seconds = random.randint(0, total_seconds)
    return start_date + timedelta(seconds=random_seconds)

def get_random_extension():
    """Get a random file extension."""
    category = random.choice(list(FILE_EXTENSIONS.keys()))
    return random.choice(FILE_EXTENSIONS[category]), category

def create_folder_metadata(folder_id, folder_name, path, parent_id=None):
    """Create metadata for a folder."""
    now = datetime.now()
    created = random_date(datetime(2020, 1, 1), now)
    modified = random_date(created, now)
    accessed = random_date(modified, now)
    
    name = folder_name
    full_path = path
    
    metadata = {
        # Mandatory fields
        'id': folder_id,
        'parent_id': parent_id if parent_id else '',
        
        # Basic attributes
        'name': name,
        'type': 'folder',
        'depth': len(full_path.split('/')) - 1,
        'is_directory': True,
        'is_file': False,
        
        # New required fields
        'size': 0,  # Folder size in bytes
        'extension': '',  # Folders have no extension
        'metadata_types': ['folder', 'directory', 'container'],
        
        # Timestamps
        'created_at': created.isoformat(),
        'modified_at': modified.isoformat(),
        'accessed_at': accessed.isoformat(),
        'indexed_at': now.isoformat(),
        
        # Size and capacity
        'size_bytes': 0,  # Calculated based on contents
        'item_count': 0,  # Will be updated
        'total_size': 0,  # Will be updated
        
        # Ownership and permissions
        'owner': random.choice(USERS),
        'created_by': random.choice(USERS),
        'modified_by': random.choice(USERS),
        'group': random.choice(DEPARTMENTS),
        'permissions': random.choice(['rwxr-xr-x', 'rwxrwxr-x', 'rwx------', 'rwxr-x---']),
        'permission_code': random.choice([755, 775, 700, 750]),
        'is_readable': True,
        'is_writable': random.choice([True, False]),
        'is_executable': True,
        
        # Classification
        'department': random.choice(DEPARTMENTS),
        'project': random.choice(PROJECTS),
        'tags': random.sample(TAGS, k=random.randint(1, 4)),
        'category': 'directory',
        'classification': random.choice(['public', 'internal', 'confidential', 'restricted']),
        
        # Storage metadata
        'storage_tier': random.choice(['hot', 'warm', 'cold', 'archive']),
        'compression_enabled': random.choice([True, False]),
        'encryption_enabled': random.choice([True, False]),
        'backup_enabled': True,
        'replication_factor': random.randint(1, 3),
        
        # Versioning
        'version': '1.0',
        'version_count': 1,
        'is_latest': True,
        
        # Additional metadata
        'description': f"Folder containing {name} related items",
        'checksum': generate_md5(full_path),
        'uuid': str(uuid.uuid4()),
        'inode': random.randint(1000000, 9999999),
        'mount_point': '/data',
        'filesystem_type': 'ext4',
    }
    
    return metadata

def create_file_metadata(file_id, file_name, path, parent_id, extension, category):
    """Create metadata for a file."""
    now = datetime.now()
    created = random_date(datetime(2020, 1, 1), now)
    modified = random_date(created, now)
    accessed = random_date(modified, now)
    
    name = file_name
    full_path = path
    size = random.randint(1024, 100 * 1024 * 1024)  # 1KB to 100MB
    
    metadata = {
        # Mandatory fields
        'id': file_id,
        'parent_id': parent_id,
        
        # Basic attributes
        'name': name,
        'type': 'file',
        'depth': len(full_path.split('/')) - 1,
        'is_directory': False,
        'is_file': True,
        'extension': extension,
        
        # New required fields
        'size': size,  # File size in bytes
        'metadata_types': [category, 'file', extension[1:] if extension else 'unknown'],
        
        # Timestamps
        'created_at': created.isoformat(),
        'modified_at': modified.isoformat(),
        'accessed_at': accessed.isoformat(),
        'indexed_at': now.isoformat(),
        
        # Size
        'size_bytes': size,
        'size_kb': round(size / 1024, 2),
        'size_mb': round(size / (1024 * 1024), 2),
        
        # Ownership and permissions
        'owner': random.choice(USERS),
        'created_by': random.choice(USERS),
        'modified_by': random.choice(USERS),
        'group': random.choice(DEPARTMENTS),
        'permissions': random.choice(['rw-r--r--', 'rw-rw-r--', 'rw-------', 'rwxr-xr-x']),
        'permission_code': random.choice([644, 664, 600, 755]),
        'is_readable': True,
        'is_writable': random.choice([True, False]),
        'is_executable': extension in ['.py', '.sh', '.exe', '.bin'],
        
        # Classification
        'department': random.choice(DEPARTMENTS),
        'project': random.choice(PROJECTS),
        'tags': random.sample(TAGS, k=random.randint(1, 5)),
        'category': category,
        'classification': random.choice(['public', 'internal', 'confidential', 'restricted']),
        
        # File-specific metadata
        'mime_type': MIME_TYPES.get(extension, 'application/octet-stream'),
        'encoding': random.choice(['UTF-8', 'ASCII', 'ISO-8859-1']) if category in ['documents', 'code', 'data'] else None,
        'line_count': random.randint(10, 10000) if category in ['code', 'data'] else None,
        
        # Storage metadata
        'storage_tier': random.choice(['hot', 'warm', 'cold', 'archive']),
        'compression_enabled': random.choice([True, False]),
        'compression_ratio': round(random.uniform(0.3, 0.9), 2),
        'encryption_enabled': random.choice([True, False]),
        'encryption_algorithm': random.choice(['AES-256', 'AES-128', None]),
        'backup_enabled': True,
        'last_backup': random_date(modified, now).isoformat(),
        'replication_factor': random.randint(1, 3),
        
        # Versioning
        'version': f"{random.randint(1, 10)}.{random.randint(0, 99)}",
        'version_count': random.randint(1, 20),
        'is_latest': random.choice([True, False]),
        
        # Checksums
        'md5': generate_md5(full_path),
        'sha256': generate_sha256(full_path),
        'checksum': generate_md5(full_path),
        
        # Additional metadata
        'description': f"{category.title()} file",
        'uuid': str(uuid.uuid4()),
        'inode': random.randint(1000000, 9999999),
        'mount_point': '/data',
        'filesystem_type': 'ext4',
        'block_size': 4096,
        'blocks_allocated': (size // 4096) + 1,
    }
    
    return metadata

def generate_filesystem():
    """Generate the complete filesystem structure."""
    print(f"Generating filesystem with {TOTAL_ITEMS} items...")
    
    items = []
    current_id = 1
    
    # Calculate folder distribution
    num_folders = TOTAL_ITEMS // (MIN_ITEMS_PER_FOLDER + 1)
    items_per_folder = TOTAL_ITEMS // num_folders
    
    print(f"Creating {num_folders} folders with ~{items_per_folder} items each")
    
    # Create root with ID 0
    root_id = "0"
    root = create_folder_metadata(root_id, "root", "/root", None)
    items.append(root)
    # Don't increment current_id, start from 1 for other items
    
    # Create top-level folders (departments)
    dept_folders = []
    for dept in DEPARTMENTS[:7]:  # Use 7 departments
        folder_id = f"id_{current_id:08d}"
        folder_name = dept.lower()
        path = "/root"
        folder = create_folder_metadata(folder_id, folder_name, path, root_id)
        items.append(folder)
        dept_folders.append((folder_id, path, folder_name))
        current_id += 1
    
    # Create subfolders and files
    remaining_items = TOTAL_ITEMS - len(items)
    folders_to_create = num_folders - len(items)
    
    folder_parents = dept_folders.copy()
    all_folders = dept_folders.copy()
    
    # Create nested folder structure
    while folders_to_create > 0 and folder_parents:
        parent_id, parent_path, parent_name = random.choice(folder_parents)
        
        # Create a subfolder
        folder_name = generate_random_string(8)
        folder_id = f"id_{current_id:08d}"
        path = f"{parent_path}/{parent_name}"
        folder = create_folder_metadata(folder_id, folder_name, path, parent_id)
        items.append(folder)
        all_folders.append((folder_id, path, folder_name))
        current_id += 1
        folders_to_create -= 1
        
        if random.random() > 0.7:  # 30% chance to use this as a new parent
            folder_parents.append((folder_id, path, folder_name))
        
        if len(folder_parents) > 50:  # Limit active parents
            folder_parents.pop(0)
    
    print(f"Created {len(all_folders)} folders")
    
    # Distribute files across folders
    remaining_items = TOTAL_ITEMS - len(items)
    files_per_folder = max(MIN_ITEMS_PER_FOLDER, remaining_items // len(all_folders))
    
    print(f"Creating {remaining_items} files...")
    
    # First pass: ensure each folder gets at least MIN_ITEMS_PER_FOLDER
    for folder_id, folder_path, folder_name in all_folders:
        if remaining_items <= 0:
            break
        
        num_files = min(MIN_ITEMS_PER_FOLDER, remaining_items)
        
        for _ in range(num_files):
            extension, category = get_random_extension()
            file_name = generate_random_string(12) + extension
            file_id = f"id_{current_id:08d}"
            path = f"{folder_path}/{folder_name}"
            
            file_metadata = create_file_metadata(file_id, file_name, path, folder_id, extension, category)
            items.append(file_metadata)
            current_id += 1
            remaining_items -= 1
            
            if current_id % 10000 == 0:
                print(f"  Generated {current_id} items...")
    
    # Second pass: distribute remaining files
    while remaining_items > 0:
        folder_id, folder_path, folder_name = random.choice(all_folders)
        
        extension, category = get_random_extension()
        file_name = generate_random_string(12) + extension
        file_id = f"id_{current_id:08d}"
        path = f"{folder_path}/{folder_name}"
        
        file_metadata = create_file_metadata(file_id, file_name, path, folder_id, extension, category)
        items.append(file_metadata)
        current_id += 1
        remaining_items -= 1
        
        if current_id % 10000 == 0:
            print(f"  Generated {current_id} items...")
    
    return items

def write_ndjson(items, filename):
    """Write items to NDJSON file."""
    print(f"Writing {len(items)} items to {filename}...")
    
    with open(filename, 'w') as f:
        for item in items:
            f.write(json.dumps(item) + '\n')
    
    print(f"Successfully wrote {len(items)} items to {filename}")
    
    # Print file size
    file_size = Path(filename).stat().st_size
    print(f"File size: {file_size / (1024*1024):.2f} MB")

def main():
    """Main execution function."""
    print("Starting filesystem generation...")
    print("=" * 60)
    
    items = generate_filesystem()
    
    print("=" * 60)
    write_ndjson(items, OUTPUT_FILE)
    
    print("=" * 60)
    print("Summary:")
    print(f"  Total items: {len(items)}")
    print(f"  Folders: {sum(1 for item in items if item['type'] == 'folder')}")
    print(f"  Files: {sum(1 for item in items if item['type'] == 'file')}")
    print(f"  Output file: {OUTPUT_FILE}")
    print("=" * 60)
    print("Done!")

if __name__ == "__main__":
    main()