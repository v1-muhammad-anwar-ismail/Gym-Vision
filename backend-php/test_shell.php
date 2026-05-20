<?php
$pythonExecutable = "D:\\Semester 4\\RPL\\Tugas\\GymVision\\BicepCurl_RPL\\env\\Scripts\\python.exe";
$scriptPath = "D:\\Semester 4\\RPL\\Tugas\\GymVision\\BicepCurl_RPL\\bicep_curl.py";
$command = "\"{$pythonExecutable}\" \"{$scriptPath}\"";
echo "Command: $command\n";
$output = shell_exec($command);
var_dump($output);
