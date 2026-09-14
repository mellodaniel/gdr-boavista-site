import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Run the image pipeline without network access or real Supabase writes.
const records = new Map();
const uploads = [];
let failSave = false;
let failUpload = false;
const storage = {
  getPublicUrl: path => ({ data: { publicUrl: `https://example.invalid/${path}` } }),
  upload: async (path, blob, options) => {
    uploads.push({ path, blob, options });
    if (failUpload) { failUpload = false; return { error: new Error('network failed') }; }
    return { error: null };
  },
};
const supabase = {
  storage: { from: () => storage },
  from: () => ({
    select: () => ({ eq: (_, id) => ({ maybeSingle: async () => ({ data: records.get(id) ?? null, error: null }) }) }),
    upsert: async photo => {
      records.set(photo.id, photo);
      if (failSave) { failSave = false; return { error: new Error('response lost') }; }
      return { error: null };
    },
  }),
};
let released = 0;
const canvasSizes = [];
const context = vm.createContext({
  Blob, File, Intl, Error, Math, Promise,
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => released++ },
  Image: class { naturalWidth = 4000; naturalHeight = 3000; async decode() {} },
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob(callback, type) { canvasSizes.push([this.width, this.height]); callback(new Blob(['jpeg'], { type })); } }) },
});
const stub = new vm.SyntheticModule(['supabase'], function() { this.setExport('supabase', supabase); }, { context });
const code = ts.transpileModule(readFileSync(new URL('../src/lib/gallery.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = new vm.SourceTextModule(code, { context });
await module.link(() => stub); await module.evaluate();
const { prepareGalleryPhoto, uploadAlbumPhoto, galleryError } = module.namespace;
const file = new File(['photo'], 'match.jpg', { type: 'image/jpeg' });
const prepared = await prepareGalleryPhoto(file);
assert.equal(prepared.full.width, 2400); assert.equal(prepared.full.height, 1800);
assert.equal(prepared.thumbnail.width, 640); assert.equal(prepared.thumbnail.height, 480);
assert.equal(prepared.full.blob.type, 'image/jpeg'); assert.equal(released, 1);
await assert.rejects(() => prepareGalleryPhoto(new File(['text'], 'notes.txt', { type: 'text/plain' })), /Formato não suportado/);
await assert.rejects(() => prepareGalleryPhoto({ name: 'large.jpg', type: 'image/jpeg', size: 41 * 1024 * 1024 }), /40 MB/);
const stages = [];
const photo = await uploadAlbumPhoto('album', file, 'photo-1', 0, stage => stages.push(stage));
assert.equal(photo.storage_path, 'galeria/albuns/album/photo-1.jpg');
assert.equal(uploads.length, 2); assert.equal(uploads[0].options.upsert, true);
assert.deepEqual(stages, ['A preparar', 'A carregar', 'A guardar']);
await uploadAlbumPhoto('album', file, 'photo-1', 0, () => {});
assert.equal(uploads.length, 2, 'Retry must not upload an already committed photo');
failSave = true;
await assert.rejects(() => uploadAlbumPhoto('album', file, 'photo-2', 1, () => {}), /response lost/);
const beforeRetry = uploads.length;
await uploadAlbumPhoto('album', file, 'photo-2', 1, () => {});
assert.equal(uploads.length, beforeRetry, 'Lost response must not duplicate the photo');
failUpload = true;
await assert.rejects(() => uploadAlbumPhoto('album', file, 'photo-3', 2, () => {}), /network failed/);
assert.equal(records.has('photo-3'), false);
await uploadAlbumPhoto('album', file, 'photo-3', 2, () => {});
assert.equal(records.size, 3);
assert.match(galleryError(new Error('mime type image/heic is not supported')), /image\/heic/);
console.log('Gallery pipeline: dimensions, JPEG, validation, stable retries, lost response and network recovery passed.');
