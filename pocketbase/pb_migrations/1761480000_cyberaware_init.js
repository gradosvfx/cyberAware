/// <reference path="../pb_data/types.d.ts" />

// Migración inicial de CyberAware.
// Define la colección de usuarios (acceso con nombre de usuario, sin registro abierto),
// la colección "progreso" con sus reglas de acceso y los ajustes de la aplicación
// (copias programadas, conservación de registros y proxy de confianza).
// PocketBase la aplica automáticamente al arrancar.

migrate((app) => {
  // ---------------------------------------------------------------------
  // 1. Colección users
  // ---------------------------------------------------------------------
  const users = app.findCollectionByNameOrId("users");

  // Minimización de datos: fuera nombre real y avatar.
  users.fields.removeByName("name");
  users.fields.removeByName("avatar");

  // El correo existe como campo del sistema, pero no es obligatorio y se deja vacío.
  users.fields.getByName("email").required = false;

  // Contraseña: mínimo 15 caracteres (NIST SP 800-63B-4). PocketBase la guarda con bcrypt.
  users.fields.getByName("password").min = 15;

  // Nombre de usuario genérico (empleado01, empleado02...), campo de identidad.
  users.fields.add(new TextField({
    name: "username",
    required: true,
    min: 3,
    max: 30,
    pattern: "^[a-z0-9_]+$",
    presentable: true,
  }));
  users.indexes = [
    "CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)",
    "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''",
    "CREATE UNIQUE INDEX `idx_username_users` ON `users` (`username`)",
  ];

  // Solo usuario + contraseña; sin OAuth2, OTP ni MFA.
  users.passwordAuth.enabled = true;
  users.passwordAuth.identityFields = ["username"];
  users.oauth2.enabled = false;
  users.otp.enabled = false;
  users.mfa.enabled = false;
  users.authAlert.enabled = false; // no hay correo configurado
  users.authToken.duration = 28800; // sesión de 8 horas

  // Reglas: cada usuario solo ve su propia cuenta; crear, modificar y borrar
  // quedan bloqueados (null = solo superusuario).
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.createRule = null;
  users.updateRule = null;
  users.deleteRule = null;

  app.save(users);

  // ---------------------------------------------------------------------
  // 2. Colección progreso
  // ---------------------------------------------------------------------
  const ESTADOS = ["pendiente", "en_progreso", "completada"];

  const progreso = new Collection({
    type: "base",
    name: "progreso",
    listRule: "usuario = @request.auth.id",
    viewRule: "usuario = @request.auth.id",
    createRule: "@request.auth.id != \"\" && @request.auth.collectionName = \"users\" && @request.body.usuario = @request.auth.id",
    updateRule: "usuario = @request.auth.id && @request.body.usuario:isset = false",
    deleteRule: null,
    fields: [
      {
        name: "usuario",
        type: "relation",
        required: true,
        collectionId: users.id,
        cascadeDelete: true, // al borrar una cuenta se borra su progreso
        maxSelect: 1,
      },
      {
        name: "modulo",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["contrasenas", "phishing", "ingenieria", "https"],
      },
      { name: "estado_iniciales", type: "select", required: true, maxSelect: 1, values: ESTADOS },
      { name: "estado_teoria", type: "select", required: true, maxSelect: 1, values: ESTADOS },
      { name: "estado_caso", type: "select", required: true, maxSelect: 1, values: ESTADOS },
      { name: "estado_actividad", type: "select", required: true, maxSelect: 1, values: ESTADOS },
      { name: "estado_finales", type: "select", required: true, maxSelect: 1, values: ESTADOS },
      { name: "porcentaje", type: "number", min: 0, max: 100, onlyInt: true },
      { name: "respuestas_iniciales", type: "json", maxSize: 2000 },
      { name: "respuestas_finales", type: "json", maxSize: 2000 },
      { name: "aciertos_iniciales", type: "number", min: 0, max: 3, onlyInt: true },
      { name: "aciertos_finales", type: "number", min: 0, max: 3, onlyInt: true },
      { name: "puntuacion_actividad", type: "number", min: 0, max: 100, onlyInt: true },
      { name: "valoracion_general", type: "number", min: 1, max: 5, onlyInt: true },
      { name: "valoracion_claridad", type: "number", min: 1, max: 5, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_progreso_usuario_modulo` ON `progreso` (`usuario`, `modulo`)",
    ],
  });
  app.save(progreso);

  // ---------------------------------------------------------------------
  // 3. Sesión de superusuario reducida (30 minutos)
  // ---------------------------------------------------------------------
  const superusers = app.findCollectionByNameOrId("_superusers");
  superusers.authToken.duration = 1800;
  app.save(superusers);

  // ---------------------------------------------------------------------
  // 4. Ajustes de la aplicación
  // ---------------------------------------------------------------------
  const settings = app.settings();
  settings.meta.appName = "CyberAware";
  // Copia diaria a las 12:00 UTC (13:00 en invierno, 14:00 en verano en España);
  // se conserva solo la última dentro de pb_data/backups.
  settings.backups.cron = "0 12 * * *";
  settings.backups.cronMaxKeep = 1;
  // Registros: 7 días, con IP pero sin identificador de usuario.
  settings.logs.maxDays = 7;
  settings.logs.logIP = true;
  settings.logs.logAuthId = false;
  // PocketBase está detrás de Caddy y del WAF: la IP real llega en X-Forwarded-For.
  settings.trustedProxy.headers = ["X-Forwarded-For"];
  settings.trustedProxy.useLeftmostIP = true;
  app.save(settings);
}, (app) => {
  // Reversión: elimina la colección progreso y deja users como estaba.
  const progreso = app.findCollectionByNameOrId("progreso");
  app.delete(progreso);

  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("username");
  users.indexes = [
    "CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)",
    "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''",
  ];
  users.fields.getByName("email").required = true;
  users.fields.getByName("password").min = 8;
  users.passwordAuth.identityFields = ["email"];
  users.createRule = "";
  users.updateRule = "id = @request.auth.id";
  users.deleteRule = "id = @request.auth.id";
  app.save(users);
});
