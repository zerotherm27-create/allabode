-- Google Drive archive columns on statements_of_account
alter table statements_of_account
  add column if not exists gdrive_file_id    text,
  add column if not exists gdrive_folder_url text;
